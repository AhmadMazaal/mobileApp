import React from 'react';
import { ParamListBase, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { themeStyles } from '@styles';
import { EventType, NotificationType, Profile, Transaction, TransactionsFilter } from '@types';
import { TransactionsFilterComponent } from './components/transactionsFilter.component';
import { globals } from '@globals/globals';
import { constants } from '@globals/constants';
import * as SecureStore from 'expo-secure-store';
import { eventManager } from '@globals';
import { api, getAnonymousProfile } from '@services';
import CloutFeedLoader from '@components/loader/cloutFeedLoader.component';
import { filterTransactions } from './transactionsFilterHelper';
import { BasicTransferTransaction } from './components/basicTransferTransaction.component';
import { CreatorCoinTransaction } from './components/creatorCoinTransaction.component';
import { DiamondTransaction } from './components/diamondTransaction.component';

type RouteParams = {
    TransactionsHistory: {
        publicKey: string;
    }
};

interface Props {
    navigation: StackNavigationProp<ParamListBase>
    route: RouteProp<RouteParams, 'TransactionsHistory'>;
}

interface State {
    isLoading: boolean;
    isRefreshing: boolean;
    isLoadingMore: boolean;
    isFilterShown: boolean;
    filter: TransactionsFilter[];
    transactions: Transaction[];
}

export class TransactionsHistoryScreen extends React.Component<Props, State> {

    private _isMounted = false;

    private profilesMap: { [key: string]: Profile } = {}

    private lastTransactionIndex = -1;

    private _subscriptions: (() => void)[] = [];

    private _allTransactions: Transaction[] = [];

    private _noMoreTransactions = false;

    private readonly PUBLIC_KEY = this.props.route.params?.publicKey || globals.user.publicKey;

    constructor(props: Props) {
        super(props);

        this.state = {
            isLoading: true,
            isRefreshing: false,
            isLoadingMore: false,
            isFilterShown: false,
            filter: [],
            transactions: []
        };

        this._subscriptions.push(
            eventManager.addEventListener(EventType.OpenTransactionsFilter, this.toggleFilter.bind(this))
        );

        this.init();
    }

    componentDidMount() {
        this._isMounted = true;
    }

    componentWillUnmount() {
        this._isMounted = false;

        for (const subscription of this._subscriptions) {
            subscription();
        }
    }

    private async init() {
        try {
            const transactionsFilterKey = globals.user.publicKey + constants.localStorage_notificationsHistory;
            const filterString = await SecureStore.getItemAsync(transactionsFilterKey);

            let filter: TransactionsFilter[] = [];

            if (filterString != null) {
                try {
                    filter = JSON.parse(filterString);
                } catch {

                }
            }

            this.loadTransactions(filter);

        } catch {

        }
    }

    private async loadTransactions(filter: TransactionsFilter[]) {
        this.profilesMap = {};
        this.lastTransactionIndex = -1;
        this._allTransactions = [];
        this._noMoreTransactions = false;

        if (this._isMounted && !this.state.isLoading) {
            this.setState({ isLoading: true });
        }

        try {
            const transactions: Transaction[] = await this.fetchTransactions(filter);

            if (this._isMounted) {
                this.setState({ transactions, filter, isLoading: false, isFilterShown: false });
            }

        } catch (error) {

            if (this._isMounted) {
                this.setState({ isLoading: false, isFilterShown: false });
            }
        }
    }

    private async loadMoreTransactions(filter: TransactionsFilter[]) {
        if (this._isMounted && !this.state.isLoadingMore && !this.state.isLoading && !this._noMoreTransactions) {
            this.setState({ isLoadingMore: true });
        } else {
            return;
        }

        try {
            const transactions: Transaction[] = await this.fetchTransactions(filter);

            if (this._isMounted) {
                const newTransactions = this.state.transactions.concat(transactions);
                this.setState({ transactions: newTransactions, filter, isLoadingMore: false });
            }

        } catch (error) {
            if (this._isMounted) {
                this.setState({ isLoadingMore: false });
            }
        }
    }

    private async fetchTransactions(filter: TransactionsFilter[], limit = 10): Promise<Transaction[]> {
        const transactions: Transaction[] = [];

        let multiplier = 1;
        while (transactions.length < limit) {
            const fetchCount = Math.min(200 * multiplier, 6400);
            const response = await api.getTransactions(this.PUBLIC_KEY, this.lastTransactionIndex, fetchCount);
            const transactionsBatch: Transaction[] = filterTransactions(response.Transactions, filter, this.PUBLIC_KEY);
            await this.loadProfiles(transactionsBatch);

            transactions.push(...transactionsBatch);

            this._allTransactions = this._allTransactions.concat(response.Transactions);
            if (response.Transactions.length < fetchCount || !this._isMounted) {
                this._noMoreTransactions = true;
                break;
            }

            multiplier *= 2;
            this.lastTransactionIndex = response.LastPublicKeyTransactionIndex;
        }

        return transactions;
    }

    private async loadProfiles(transactions: Transaction[]) {
        let promises: Promise<void>[] = [];

        for (const transaction of transactions) {
            const publicKeys = transaction.TransactionMetadata.AffectedPublicKeys?.map(p => p.PublicKeyBase58Check);
            if (publicKeys != null && publicKeys.length > 0) {

                for (const publicKey of publicKeys) {
                    if (this.profilesMap[publicKey]) {
                        continue;
                    }

                    const promise = new Promise<void>(
                        (p_resolve) => {
                            api.getSingleProfile('', publicKey).then(
                                p_response => {
                                    const profile: Profile = p_response.Profile;
                                    if (profile) {
                                        this.profilesMap[publicKey] = profile;
                                    }
                                    p_resolve();
                                }
                            ).catch(() => {
                                this.profilesMap[publicKey] = getAnonymousProfile(publicKey);
                                p_resolve();
                            });
                        }
                    );
                    promises.push(promise);
                }
            }

            if (promises.length > 20) {
                await Promise.all(promises);
                promises = [];
            }
        }

        if (promises.length > 0) {
            await Promise.all(promises);
        }
    }

    private toggleFilter(): void {
        if (this._isMounted) {
            this.setState({ isFilterShown: true });
        }
    }

    private async onFilterChange(filter: TransactionsFilter[]) {
        try {
            const filterJson = JSON.stringify(filter);

            if (filterJson === JSON.stringify(this.state.filter)) {
                this.setState({ isFilterShown: false });
                return;
            }

            const transactionsFilterKey = globals.user.publicKey + constants.localStorage_notificationsHistory;
            await SecureStore.setItemAsync(transactionsFilterKey, filterJson);

            if (this._isMounted) {
                this.setState({ filter, isFilterShown: false });
                const filteredTransactions = filterTransactions(this._allTransactions, filter, this.PUBLIC_KEY);
                await this.loadProfiles(filteredTransactions);

                if (this._isMounted) {
                    this.setState({ transactions: filteredTransactions });
                    if (filteredTransactions.length < 20) {
                        this.loadMoreTransactions(filter);
                    }
                }
            }
        } catch { }
    }

    render() {
        if (this.state.isLoading) {
            return <CloutFeedLoader />;
        }

        const keyExtractor = (item: Transaction, index: number) => item.TransactionIDBase58Check + index;
        const renderFooter = () => this.state.isLoadingMore ? <ActivityIndicator color={themeStyles.fontColorMain.color} /> : <View />;
        const renderRefresh = <RefreshControl
            tintColor={themeStyles.fontColorMain.color}
            titleColor={themeStyles.fontColorMain.color}
            refreshing={this.state.isRefreshing}
            onRefresh={() => this.loadTransactions(this.state.filter)} />;

        const renderTransaction = ({ item }: { item: Transaction }) => {
            switch (item.TransactionType) {
                case NotificationType.BasicTransfer: {
                    const diamondLevel = item.TransactionMetadata.BasicTransferTxindexMetadata?.DiamondLevel;
                    if (diamondLevel === 0) {
                        return <BasicTransferTransaction
                            userPublicKey={this.PUBLIC_KEY}
                            transaction={item}
                            profilesMap={this.profilesMap}
                            navigation={this.props.navigation}
                        />;
                    } else if (diamondLevel != null && diamondLevel > 0) {
                        return <DiamondTransaction
                            userPublicKey={this.PUBLIC_KEY}
                            transaction={item}
                            profilesMap={this.profilesMap}
                            navigation={this.props.navigation}
                        />;
                    }
                }
                    break;
                case NotificationType.CreatorCoin:
                    return <CreatorCoinTransaction
                        userPublicKey={this.PUBLIC_KEY}
                        transaction={item}
                        profilesMap={this.profilesMap}
                        navigation={this.props.navigation}
                    />;
            }

            return <></>;
        };

        return <View style={[styles.container, themeStyles.containerColorMain]}>
            {
                this.state.isFilterShown &&
                <TransactionsFilterComponent
                    filter={this.state.filter}
                    isFilterShown={this.state.isFilterShown}
                    onFilterChange={(filter: TransactionsFilter[]) => this.onFilterChange(filter)}
                />
            }

            <FlatList
                data={this.state.transactions}
                keyExtractor={keyExtractor}
                renderItem={renderTransaction}
                showsVerticalScrollIndicator={false}
                onEndReached={() => this.loadMoreTransactions(this.state.filter)}
                onEndReachedThreshold={4}
                maxToRenderPerBatch={20}
                windowSize={20}
                refreshControl={renderRefresh}
                ListFooterComponent={renderFooter}
            />
        </View>;
    }
}

const styles = StyleSheet.create(
    {
        container: {
            flex: 1
        }
    }
);
