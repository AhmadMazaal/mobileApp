import React from 'react';
import { StyleSheet, View, FlatList, ActivityIndicator, TextInput, Text, TouchableOpacity } from 'react-native';
import { ParamListBase } from '@react-navigation/routers';
import { StackNavigationProp } from '@react-navigation/stack';
import { themeStyles } from '@styles/globalColors';
import { ContactWithMessages, EventType } from '@types';
import { RouteProp } from '@react-navigation/core';
import SwipeableContactComponent from './components/swipeableContact.component';
import { filterContacts } from './services/contactsHelpers';
import { eventManager } from '@globals/injector';
import { snackbar } from '@services/snackbar';
import { Ionicons } from '@expo/vector-icons';

type RouteParams = {
    contacts: {
        contacts: ContactWithMessages[];
    };
};

interface Props {
    navigation: StackNavigationProp<ParamListBase>;
    route: RouteProp<RouteParams, 'contacts'>;
}

interface State {
    contacts: ContactWithMessages[];
    isLoadingMore: boolean;
    query: string;
}

export default class ArchivedMessagesScreen extends React.Component<Props, State> {

    private _isMounted = false;

    private _contactsCopy: ContactWithMessages[] = [];

    constructor(props: Props) {
        super(props);

        this.state = {
            contacts: this.props.route.params.contacts,
            isLoadingMore: false,
            query: ''
        };
        this._contactsCopy = this.props.route.params.contacts;
        this.handleSearchContact = this.handleSearchContact.bind(this);
        this.updateContacts = this.updateContacts.bind(this);
        this.handleQuery = this.handleQuery.bind(this);
        this.clearQuery = this.clearQuery.bind(this);
    }

    componentDidMount(): void {
        this._isMounted = true;
    }

    componentWillUnmount(): void {
        this._isMounted = false;
    }

    componentDidUpdate(): void {
        if (this.state.contacts.length === 0 && this.state.query.length === 0) {
            this.props.navigation.pop();
        }
    }

    private async updateContacts(recipientPublicKey: string) {
        const { filteredContacts, removedContact } = await filterContacts(this.props.route.params.contacts, recipientPublicKey, true);
        eventManager.dispatchEvent(EventType.UpdateArchivedChats, { unarchivedContact: removedContact });
        if (this._isMounted && filteredContacts) {
            this.setState({ contacts: filteredContacts });
        }
        snackbar.showSnackBar({ text: 'Chat removed from archives' });
    }

    private handleSearchContact(query: string): void {
        const contacts = this.state.contacts.filter(
            (contact: ContactWithMessages) => contact.ProfileEntryResponse?.Username === query
        );
        this._contactsCopy = contacts;
        if (this._isMounted) {
            this.setState({ contacts });
        }
    }

    private clearQuery(): void {
        if (this._isMounted) {
            this.setState({ query: '', contacts: this._contactsCopy });
        }
    }

    private handleQuery(query: string): void {
        const contacts = this._contactsCopy.filter(
            (contact: ContactWithMessages) => contact.ProfileEntryResponse?.Username.toLowerCase().includes(query.toLowerCase().trim())
        );
        if (this._isMounted) {
            this.setState({ query, contacts });
        }
    }

    render(): JSX.Element {
        const keyExtractor = (item: ContactWithMessages, index: number): string => `${item.PublicKeyBase58Check}_${index.toString()}`;
        const renderItem = ({ item, index }: { item: ContactWithMessages, index: number }): JSX.Element => <SwipeableContactComponent
            filterContacts={this.updateContacts}
            index={index}
            swipeTitle={'Unarchive'}
            contact={item} />;
        const renderFooter = this.state.isLoadingMore ? <ActivityIndicator color={themeStyles.fontColorMain.color} /> : <></>;
        return <View style={[styles.container, themeStyles.containerColorMain]}>
            <View style={
                [
                    themeStyles.containerColorSub,
                    styles.row,
                    styles.searchBoxContainer,
                ]
            }>
                <View style={styles.row}>
                    <Ionicons style={[styles.searchIcon, themeStyles.fontColorSub]} name="ios-search" size={20} color={themeStyles.fontColorMain.color} />
                    <TextInput
                        placeholder={'Search contacts'}
                        placeholderTextColor={themeStyles.fontColorSub.color}
                        onChangeText={this.handleQuery}
                        value={this.state.query}
                        style={[styles.searchInput, themeStyles.fontColorSub]}
                    />
                </View>
                <TouchableOpacity onPress={this.clearQuery} activeOpacity={1}>
                    <Ionicons name="close-circle-sharp" size={20} color={themeStyles.fontColorMain.color} />
                </TouchableOpacity>
            </View>
            {
                this.state.contacts.length === 0 ?
                    <Text style={[themeStyles.fontColorSub, styles.emptyFollowers]}>No result</Text> :
                    <FlatList
                        style={styles.flatListStyle}
                        data={this.state.contacts}
                        keyExtractor={keyExtractor}
                        renderItem={renderItem}
                        ListFooterComponent={renderFooter}
                    />
            }
        </View>;
    }
}

const styles = StyleSheet.create(
    {
        container: {
            flex: 1
        },
        flatListStyle: {
            marginVertical: 20
        },
        row: {
            flexDirection: 'row',
            alignItems: 'center'
        },
        searchIcon: {
            marginRight: 10
        },
        searchBoxContainer: {
            alignSelf: 'center',
            borderRadius: 6,
            paddingHorizontal: 6,
            width: '95%',
            justifyContent: 'space-between',
            marginTop: 10,
            marginBottom: 15
        },
        searchInput: {
            width: '85%',
            paddingVertical: 10,
        },
        emptyFollowers: {
            fontSize: 17,
            paddingTop: 40,
            textAlign: 'center'
        },
    }
);
