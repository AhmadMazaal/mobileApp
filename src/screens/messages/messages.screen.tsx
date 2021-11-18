import React from 'react';
import { eventManager } from '@globals/injector';
import { themeStyles } from '@styles/globalColors';
import { View, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Text, SafeAreaView, TouchableOpacity, TextInput } from 'react-native';
import { ContactWithMessages, EventType, Message, MessageFilter, MessageSort, UpdateArchivesEvent } from '@types';
import { MessageSettingsComponent } from './components/messageSettings';
import { constants } from '@globals/constants';
import { globals } from '@globals/globals';
import { api, getMessageText, snackbar } from '@services';
import { getAnonymousProfile } from '@services';
import { ContactMessagesListCardComponent } from '@screens/messages/components/contactMessagesListCard.component';
import CloutFeedLoader from '@components/loader/cloutFeedLoader.component';
import { messagesService } from '@services/messagesServices';
import { EvilIcons, Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { ParamListBase } from '@react-navigation/routers';
import { Swipeable } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { filterContacts } from './services/contactsHelpers';

interface Props {
    navigation: StackNavigationProp<ParamListBase>;
}

interface State {
    isLoading: boolean;
    isFilterShown: boolean;
    messagesFilter: MessageFilter[];
    messagesSort: MessageSort;
    contacts: ContactWithMessages[];
    refreshing: boolean;
    isLoadingMore: boolean;
    noMoreMessages: boolean;
    query: string;
}

export class MessagesScreen extends React.Component<Props, State>{

    private _isMounted = false;

    private _subscriptions: (() => void)[] = [];

    private _contactsCopy: ContactWithMessages[] = [];

    private _oldArchivedChats: ContactWithMessages[] = [];

    private _oldRecipientPublicKeys: string[] = [];

    constructor(props: Props) {
        super(props);

        this.state = {
            isLoading: true,
            isFilterShown: false,
            messagesFilter: [],
            messagesSort: MessageSort.MostRecent,
            contacts: [],
            refreshing: false,
            isLoadingMore: false,
            noMoreMessages: false,
            query: ''
        };

        messagesService.getMessageSettings().then(
            ({ messagesFilter, messagesSort }) => {
                this.loadMessages(messagesFilter, messagesSort);

                if (this._isMounted) {
                    this.setState({ messagesFilter, messagesSort });
                }
            }
        );

        this._subscriptions.push(
            eventManager.addEventListener(EventType.OpenMessagesSettings, this.toggleMessagesFilter.bind(this)),
            eventManager.addEventListener(EventType.UpdateArchivedChats, this.updateArchives.bind(this))
        );

        this.loadMessages = this.loadMessages.bind(this);
        this.loadMoreMessages = this.loadMoreMessages.bind(this);
        this.onMessageSettingChange = this.onMessageSettingChange.bind(this);
        this.toggleMessagesFilter = this.toggleMessagesFilter.bind(this);
        this.goToArchiveChat = this.goToArchiveChat.bind(this);
        this.updateContacts = this.updateContacts.bind(this);
        this.initArchives = this.initArchives.bind(this);
        this.handleQuery = this.handleQuery.bind(this);
        this.clearQuery = this.clearQuery.bind(this);

    }

    componentDidMount(): void {
        this._isMounted = true;
    }

    componentWillUnmount(): void {
        globals.dispatchRefreshMessagesEvent();

        for (const unsubscribe of this._subscriptions) {
            unsubscribe();
        }

        this._isMounted = false;
    }

    private updateArchives(event: UpdateArchivesEvent): void {
        const contacts = [event.unarchivedContact, ...this.state.contacts];
        contacts.sort((a: ContactWithMessages, b: ContactWithMessages) => b.Messages[b.Messages.length - 1].TstampNanos - a.Messages[a.Messages.length - 1].TstampNanos);
        this._oldArchivedChats = this._oldArchivedChats.filter((contact: ContactWithMessages) => contact?.PublicKeyBase58Check !== event.unarchivedContact?.PublicKeyBase58Check);
        if (this._isMounted) {
            this.setState({ contacts });
        }
    }

    private async initArchives(): Promise<void> {
        const key = `${globals.user.publicKey}${constants.localStorage_archivedChats}`;
        const chatKeys = `${globals.user.publicKey}${constants.localStorage_archivedChatsRecipientKeys}`;
        const oldArchives = await AsyncStorage.getItem(key).catch(() => undefined);
        const oldRecipientPublicKeys = await SecureStore.getItemAsync(chatKeys).catch(() => undefined);
        try {
            if (oldArchives && oldRecipientPublicKeys) {

                this._oldArchivedChats = await JSON.parse(oldArchives);
                this._oldRecipientPublicKeys = await JSON.parse(oldRecipientPublicKeys);
                const filteredContacts = this.state.contacts.filter((contact: ContactWithMessages) => !this._oldRecipientPublicKeys.includes(contact?.PublicKeyBase58Check));
                this._contactsCopy = JSON.parse(JSON.stringify(filteredContacts));
                if (this._isMounted) {
                    this.setState({ contacts: filteredContacts });
                }
            }
        } catch {
        } finally {
            if (this._isMounted) {
                this.setState({ isLoading: false });
            }
        }
    }

    private loadMessages(messageFilter: MessageFilter[], messageSort: MessageSort): void {
        if (this._isMounted && !this.state.isLoading) {
            this.setState({ isLoading: true });
        }

        messagesService.getMessagesCallback(messageFilter, 25, messageSort, '').then(
            async response => {
                const contacts = await this.processData(response);
                if (this._isMounted) {
                    this.setState(
                        {
                            contacts,
                            noMoreMessages: contacts.length < 25
                        }
                    );
                }
                this.initArchives();
            }
        );
    }

    private loadMoreMessages(): void {
        if (this.state.isLoadingMore || !this.state.contacts || this.state.contacts.length === 0 || this.state.noMoreMessages) {
            return;
        }

        if (this._isMounted) {
            this.setState({ isLoadingMore: true });
        }

        const lastPublicKey = this.state.contacts[this.state.contacts.length - 1].PublicKeyBase58Check;

        messagesService.getMessagesCallback(this.state.messagesFilter, 25, this.state.messagesSort, lastPublicKey).then(
            async response => {
                const contacts = await this.processData(response);
                if (this._isMounted) {
                    this.setState(
                        {
                            contacts: this.state.contacts.concat(contacts),
                            isLoadingMore: false,
                            noMoreMessages: contacts.length < 25
                        }
                    );
                }
            }
        );
    }

    private async handleDecryptLastMessage(message: Message): Promise<string | undefined> {
        try {
            return await getMessageText(message);
        } catch { }
    }

    private async processData(response: any): Promise<ContactWithMessages[]> {
        const unreadStateByContact = response?.UnreadStateByContact ? response.UnreadStateByContact : {};
        const contactsWithMessages: ContactWithMessages[] = response?.OrderedContactsWithMessages ? response.OrderedContactsWithMessages : [];

        for (const contactWithMessages of contactsWithMessages) {
            if (!contactWithMessages.ProfileEntryResponse) {
                contactWithMessages.ProfileEntryResponse = getAnonymousProfile(contactWithMessages.PublicKeyBase58Check);
            } else {
                contactWithMessages.ProfileEntryResponse.ProfilePic = api.getSingleProfileImage(contactWithMessages.PublicKeyBase58Check);
            }
            try {

                const lastMessage = contactWithMessages.Messages[contactWithMessages.Messages.length - 1];
                const response = await this.handleDecryptLastMessage(lastMessage);
                contactWithMessages.LastDecryptedMessage = response;
                contactWithMessages.UnreadMessages = unreadStateByContact[contactWithMessages.PublicKeyBase58Check];
            } catch { }
        }
        return contactsWithMessages;
    }

    private toggleMessagesFilter(): void {
        if (this._isMounted) {
            this.setState({ isFilterShown: true });
        }
    }

    private async onMessageSettingChange(filter: MessageFilter[], sort: MessageSort) {

        try {
            const filterJson = JSON.stringify(filter);

            if (filterJson === JSON.stringify(this.state.messagesFilter) && sort === this.state.messagesSort) {
                this.setState({ isFilterShown: false });
                return;
            }

            const messageFilterKey = globals.user.publicKey + constants.localStorage_messagesFilter;
            await AsyncStorage.setItem(messageFilterKey, filterJson);

            const messageSortKey = globals.user.publicKey + constants.localStorage_messagesSort;
            await AsyncStorage.setItem(messageSortKey, sort);

            if (this._isMounted) {
                this.setState({ messagesFilter: filter, messagesSort: sort, isFilterShown: false });
                this.loadMessages(filter, sort);
            }
        } catch { undefined; }
    }

    private async updateContacts(contact: ContactWithMessages): Promise<void> {
        try {
            const { filteredContacts } = await filterContacts(this.state.contacts, contact?.PublicKeyBase58Check);
            if (this._isMounted && filteredContacts) {
                this._oldArchivedChats.push(contact);
                this._contactsCopy = filteredContacts;
                this.setState({ contacts: filteredContacts });
                snackbar.showSnackBar({ text: 'Chat added to archives' });
            }
        } catch { }
    }

    private handleQuery(query: string): void {
        const contacts = this._contactsCopy.filter(
            (contact: ContactWithMessages) => contact.ProfileEntryResponse?.Username.toLowerCase().includes(query.toLowerCase().trim())
        );
        if (this._isMounted) {
            this.setState({ query, contacts });
        }
    }

    private goToArchiveChat(): void {
        this.props.navigation.push(
            'ArchivedMessages',
            {
                contacts: this._oldArchivedChats
            }
        );
    }

    private clearQuery(): void {
        if (this._isMounted) {
            this.setState({ query: '', contacts: this._contactsCopy });
        }
    }

    render(): JSX.Element {

        const renderRightCancelSwipe = (): JSX.Element => {
            return <View style={[styles.archiveBox, themeStyles.borderColor]}>
                <View style={{ alignItems: 'center' }}>
                    <Ionicons name="archive-outline" size={24} color="white" />
                    <Text style={styles.archiveBoxText}>Archive Chat</Text>
                </View>
            </View>;
        };

        const renderRefresh = <RefreshControl
            tintColor={themeStyles.fontColorMain.color}
            titleColor={themeStyles.fontColorMain.color}
            refreshing={this.state.refreshing}
            onRefresh={() => this.loadMessages(this.state.messagesFilter, this.state.messagesSort)}
        />;
        const keyExtractor = (item: ContactWithMessages, index: number): string => item.PublicKeyBase58Check + index.toString();
        const renderItem = ({ item }: { item: ContactWithMessages }): JSX.Element => <Swipeable
            onSwipeableRightOpen={() => this.updateContacts(item)}
            renderRightActions={renderRightCancelSwipe}
        >
            <ContactMessagesListCardComponent contactWithMessages={item} />
        </Swipeable>;
        const renderFooter = this.state.isLoadingMore ? <ActivityIndicator color={themeStyles.fontColorMain.color} /> : <></>;
        if (globals.readonly) {
            return <View style={[styles.infoMessageContainer, styles.container, themeStyles.containerColorSub]}>
                <Text style={[styles.infoText, themeStyles.fontColorMain]}>Messages are not available in the read-only mode.</Text>
            </View>;
        }

        if (globals.derived) {
            return <View style={[styles.infoMessageContainer, styles.container, themeStyles.containerColorSub]}>
                <Text style={[styles.infoText, themeStyles.fontColorMain]}>Messages are still not available when logging in with DeSo Identity right now. We are doing our best to support them as soon as possible. Otherwise, you can login with CloutFeed Identity for full support.</Text>
            </View>;
        }
        const archiveColor = themeStyles.verificationBadgeBackgroundColor.backgroundColor;
        const hasArchives = this._oldArchivedChats.length > 0;
        return <SafeAreaView style={[styles.container, themeStyles.containerColorMain]}>
            {
                this.state.isLoading ?
                    <CloutFeedLoader />
                    :
                    globals.readonly ?
                        <View style={[styles.readOnlyText, styles.container, themeStyles.containerColorSub]}>
                            <Text style={themeStyles.fontColorMain}>Messages are not available in the read-only mode.</Text>
                        </View>
                        :
                        <View style={[styles.container, themeStyles.containerColorMain]}>
                            {
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
                            }
                            {
                                this._oldArchivedChats.length > 0 && <TouchableOpacity
                                    disabled={!hasArchives}
                                    onPress={this.goToArchiveChat}
                                    activeOpacity={1}
                                    style={styles.archiveContainer}
                                >
                                    <EvilIcons name="archive" size={22} color='black' />
                                    <Text style={[styles.archiveButton, { color: archiveColor }]}>Archived Chats</Text>
                                </TouchableOpacity>
                            }
                            {
                                this.state.contacts.length === 0 && this.state.query.length > 0 ?
                                    <Text style={[themeStyles.fontColorSub, styles.emptyFollowers]}>No result</Text> :
                                    this.state.contacts.length > 0 ?
                                        <FlatList
                                            style={styles.flatListStyle}
                                            data={this.state.contacts}
                                            keyExtractor={keyExtractor}
                                            renderItem={renderItem}
                                            refreshControl={renderRefresh}
                                            onEndReached={this.loadMoreMessages}
                                            ListFooterComponent={renderFooter}
                                        />
                                        :
                                        <Text style={[themeStyles.fontColorSub, styles.emptyFollowers]}>You have no messages</Text>
                            }
                        </View>
            }
            {
                this.state.isFilterShown &&
                <MessageSettingsComponent
                    filter={this.state.messagesFilter}
                    sort={this.state.messagesSort}
                    isFilterShown={this.state.isFilterShown}
                    onSettingsChange={(filter: MessageFilter[], sort: MessageSort) => this.onMessageSettingChange(filter, sort)}
                />
            }
        </SafeAreaView>;
    }
}

const styles = StyleSheet.create(
    {
        container: {
            flex: 1,
            width: '100%'
        },
        flatListStyle: {
            marginBottom: 20
        },
        infoMessageContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 10
        },
        infoText: {
            textAlign: 'center'
        },
        readOnlyText: {
            alignItems: 'center',
            justifyContent: 'center'
        },
        archiveContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            width: '100%',
            justifyContent: 'flex-end',
            paddingRight: 15,
            marginBottom: 10
        },
        archiveButton: {
            fontSize: 15,
        },
        archiveBox: {
            backgroundColor: '#64e986',
            alignItems: 'flex-end',
            justifyContent: 'center',
            width: '100%',
            paddingRight: 25,
            height: '100%',
            borderBottomWidth: 1,
        },
        archiveBoxText: {
            color: 'white',
            paddingTop: 5,
            fontSize: 13,
        },
        emptyFollowers: {
            fontSize: 17,
            paddingTop: 40,
            textAlign: 'center'
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
            marginBottom: 10
        },
        searchInput: {
            width: '85%',
            paddingVertical: 10,
        }
    }
);
