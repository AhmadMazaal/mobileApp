import React from 'react';
import { View, StyleSheet, Text, Switch, ScrollView, TouchableOpacity } from 'react-native';
import { themeStyles } from '@styles';
import { SelectListControl } from '@controls/selectList.control';
import * as SecureStore from 'expo-secure-store';
import { constants } from '@globals/constants';
import { globals } from '@globals/globals';
import { eventManager } from '@globals/injector';
import { EventType, FeedType, HiddenNFTType, ToggleCloutCastFeedEvent, ToggleHideCoinPriceEvent } from '@types';
import CloutFeedLoader from '@components/loader/cloutFeedLoader.component';
import { MaterialIcons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { ParamListBase } from '@react-navigation/routers';

interface Props {
    navigation: StackNavigationProp<ParamListBase>;
}

interface State {
    isLoading: boolean;
    isCloutCastEnabled: boolean;
    isCoinPriceHidden: boolean;
    isSignatureEnabled: boolean;
    areNFTsHidden: boolean;
    hiddenNFTType: HiddenNFTType;
    feed: FeedType;
    appearanceLabel: string;
}

export class PreferencesScreen extends React.Component<Props, State>{

    private _isMounted = false;

    constructor(props: Props) {
        super(props);

        this.state = {
            isLoading: true,
            isCloutCastEnabled: true,
            feed: FeedType.Global,
            areNFTsHidden: false,
            isSignatureEnabled: true,
            isCoinPriceHidden: false,
            hiddenNFTType: HiddenNFTType.Details,
            appearanceLabel: ''
        };

        this.toggleCloutCastFeed = this.toggleCloutCastFeed.bind(this);
        this.onFeedTypeChange = this.onFeedTypeChange.bind(this);
        this.toggleCoinPrice = this.toggleCoinPrice.bind(this);
        this.toggleSignature = this.toggleSignature.bind(this);
        this.goToNFTSettings = this.goToNFTSettings.bind(this);
        this.goToAppearance = this.goToAppearance.bind(this);

        this.initScreen();
    }

    componentDidMount(): void {
        this._isMounted = true;
    }

    componentWillUnmount(): void {
        this._isMounted = false;
    }

    private toggleCloutCastFeed(): void {
        const newValue = !this.state.isCloutCastEnabled;
        this.setState({ isCloutCastEnabled: newValue });

        const event: ToggleCloutCastFeedEvent = { active: newValue };
        eventManager.dispatchEvent(EventType.ToggleCloutCastFeed, event);
        const key = globals.user.publicKey + constants.localStorage_cloutCastFeedEnabled;
        SecureStore.setItemAsync(key, String(newValue)).catch(() => undefined);
    }

    private async toggleCoinPrice(): Promise<void> {
        const newValue = !this.state.isCoinPriceHidden;
        this.setState({ isCoinPriceHidden: newValue });
        globals.isCoinPriceHidden = newValue;

        const event: ToggleHideCoinPriceEvent = { hidden: newValue };
        eventManager.dispatchEvent(EventType.ToggleHideCoinPrice, event);
        const key = globals.user.publicKey + constants.localStorage_coinPriceHidden;
        await SecureStore.setItemAsync(key, String(newValue)).catch(() => undefined);
    }

    private async toggleSignature(): Promise<void> {
        const newValue = !this.state.isSignatureEnabled;
        this.setState({ isSignatureEnabled: newValue });
        globals.isSignatureEnabled = newValue;

        const key = globals.user.publicKey + constants.localStorage_signatureEnabled;
        await SecureStore.setItemAsync(key, String(newValue)).catch(() => undefined);
    }

    private onFeedTypeChange(type: FeedType): void {
        this.setState({ feed: type });

        const key = globals.user.publicKey + constants.localStorage_defaultFeed;
        SecureStore.setItemAsync(key, String(type)).catch(() => undefined);
    }

    private async initScreen(): Promise<void> {
        const feedKey = globals.user.publicKey + constants.localStorage_defaultFeed;
        const feed = await SecureStore.getItemAsync(feedKey).catch(() => undefined) as FeedType;

        const signatureKey = globals.user.publicKey + constants.localStorage_signatureEnabled;
        const isSignatureEnabled = await SecureStore.getItemAsync(signatureKey).catch(() => undefined);

        const nftTypeKey = globals.user.publicKey + constants.localStorage_hiddenNFTType;
        const hiddenNFTType = await SecureStore.getItemAsync(nftTypeKey).catch(() => undefined) as HiddenNFTType;

        const key = globals.user.publicKey + constants.localStorage_cloutCastFeedEnabled;
        const isCloutCastEnabledString = await SecureStore.getItemAsync(key).catch(() => undefined);

        const nftKey = globals.user.publicKey + constants.localStorage_nftsHidden;
        const areNFTsHidden = await SecureStore.getItemAsync(nftKey).catch(() => undefined);

        const coinPriceKey = globals.user.publicKey + constants.localStorage_coinPriceHidden;
        const isCoinPriceHidden = await SecureStore.getItemAsync(coinPriceKey).catch(() => undefined);

        const appearanceKey = globals.user.publicKey + constants.localStorage_appearance;
        const appearanceLabel = await SecureStore.getItemAsync(appearanceKey).catch(() => undefined) as string;

        if (this._isMounted) {
            this.setState(
                {
                    appearanceLabel: appearanceLabel,
                    isCloutCastEnabled: isCloutCastEnabledString === 'true',
                    isSignatureEnabled: isSignatureEnabled == null || isSignatureEnabled === 'true',
                    areNFTsHidden: areNFTsHidden === 'true',
                    isCoinPriceHidden: isCoinPriceHidden === 'true',
                    feed: feed ? feed : FeedType.Global,
                    hiddenNFTType: hiddenNFTType ? hiddenNFTType : HiddenNFTType.Details,
                    isLoading: false,
                }
            );
        }
    }

    private goToAppearance(): void {
        this.props.navigation.push('Appearance');
    }

    private goToNFTSettings(): void {
        this.props.navigation.push('NFTSettings');
    }

    render(): JSX.Element {

        if (this.state.isLoading) {
            return <CloutFeedLoader />;
        }

        return <ScrollView style={[themeStyles.containerColorMain, styles.container]}>
            <TouchableOpacity
                style={[styles.cloutCastFeedSettingsContainer, themeStyles.containerColorMain, themeStyles.borderColor]}
                onPress={this.goToAppearance}
                activeOpacity={1}>
                <Text style={[styles.cloutCastFeedSettingsText, themeStyles.fontColorMain]}>Appearance</Text>
                <View style={styles.row}>
                    <Text style={[styles.appearanceText, themeStyles.fontColorSub]}>{this.state.appearanceLabel}</Text>
                    <MaterialIcons name="keyboard-arrow-right" size={27} color={themeStyles.fontColorSub.color} />
                </View>
            </TouchableOpacity>
            {
                globals.readonly ? undefined :
                    <TouchableOpacity
                        style={[styles.cloutCastFeedSettingsContainer, themeStyles.borderColor]}
                        onPress={this.goToNFTSettings}
                        activeOpacity={1}>
                        <Text style={[styles.cloutCastFeedSettingsText, themeStyles.fontColorMain]}>Configure NFTs</Text>
                        <MaterialIcons style={{ right: -8 }} name="keyboard-arrow-right" size={27} color={themeStyles.fontColorSub.color} />
                    </TouchableOpacity>
            }
            {
                globals.readonly ? undefined :
                    <View style={[styles.cloutCastFeedSettingsContainer, themeStyles.borderColor]}>
                        <Text style={[styles.cloutCastFeedSettingsText, themeStyles.fontColorMain]}>CloutCast Feed</Text>
                        <Switch
                            trackColor={{ false: themeStyles.switchColor.color, true: '#007ef5' }}
                            thumbColor={'white'}
                            ios_backgroundColor={themeStyles.switchColor.color}
                            onValueChange={this.toggleCloutCastFeed}
                            value={this.state.isCloutCastEnabled}
                        />
                    </View>
            }
            {
                globals.readonly ? undefined :
                    <View style={[styles.cloutCastFeedSettingsContainer, themeStyles.borderColor]}>
                        <Text style={[styles.cloutCastFeedSettingsText, themeStyles.fontColorMain]}>CloutFeed Signature</Text>
                        <Switch
                            trackColor={{ false: themeStyles.switchColor.color, true: '#007ef5' }}
                            thumbColor={'white'}
                            ios_backgroundColor={themeStyles.switchColor.color}
                            onValueChange={this.toggleSignature}
                            value={this.state.isSignatureEnabled}
                        />
                    </View>
            }
            {
                globals.readonly ? undefined :
                    <View style={[styles.cloutCastFeedSettingsContainer, themeStyles.borderColor]}>
                        <Text style={[styles.cloutCastFeedSettingsText, themeStyles.fontColorMain]}>Hide Coin Price</Text>
                        <Switch
                            trackColor={{ false: themeStyles.switchColor.color, true: '#007ef5' }}
                            thumbColor={'white'}
                            ios_backgroundColor={themeStyles.switchColor.color}
                            onValueChange={this.toggleCoinPrice}
                            value={this.state.isCoinPriceHidden}
                        />
                    </View>
            }
            <View>
                <Text style={[styles.defaultFeedTitle, themeStyles.fontColorMain]}>Default Feed</Text>
            </View>
            <SelectListControl
                style={[styles.selectList, themeStyles.borderColor]}
                options={[
                    {
                        name: 'Hot',
                        value: FeedType.Hot
                    },
                    {
                        name: 'Global',
                        value: FeedType.Global
                    },
                    {
                        name: 'Following',
                        value: FeedType.Following
                    },
                    {
                        name: 'Recent',
                        value: FeedType.Recent
                    },
                    {
                        name: 'Welcome',
                        value: FeedType.Welcome
                    },
                    {
                        name: 'Language',
                        value: FeedType.Language
                    }
                ]}
                value={this.state.feed}
                onValueChange={(value: string | string[]) => this.onFeedTypeChange(value as FeedType)}
            />
        </ScrollView>;
    }
}

const styles = StyleSheet.create(
    {
        container: {
            flex: 1,
        },
        cloutCastFeedSettingsContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 15,
            borderBottomWidth: 1
        },
        cloutCastFeedSettingsText: {
            fontWeight: '600',
            fontSize: 16
        },
        selectList: {
            borderBottomWidth: 1
        },
        defaultFeedTitle: {
            marginTop: 15,
            marginBottom: 5,
            fontSize: 18,
            paddingLeft: 15,
            fontWeight: '700'
        },
        row: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            right: -8,
        },
        appearanceText: {
            textTransform: 'capitalize',
            fontSize: 16,
        }
    }
);
