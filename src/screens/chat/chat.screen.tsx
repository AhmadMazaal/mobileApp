import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, SectionList, Dimensions, KeyboardAvoidingView, Platform, Keyboard, KeyboardEvent, ActivityIndicator, TouchableOpacity } from 'react-native';
import { ContactWithMessages, EventType, Message } from '@types';
import { MessageComponent } from '@components/messageComponent';
import { eventManager, globals } from '@globals';
import { api, getMessageText } from '@services';
import { themeStyles } from '@styles';
import { signing } from '@services/authorization/signing';
import CloutFeedLoader from '@components/loader/cloutFeedLoader.component';
import { RouteProp } from '@react-navigation/native';
import ChatInputComponent from './chatInput.component';
import { EvilIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Section {
    date: string;
    data: Message[];
}

type RouteParams = {
    Chat: {
        loadMessages: boolean;
        contactWithMessages: ContactWithMessages;
    }
};

interface Props {
    route: RouteProp<RouteParams, 'Chat'>
}

const { height: screenHeight } = Dimensions.get('screen');

export function ChatScreen({ route }: Props) {

    const [isLoading, setLoading] = useState<boolean>(true);
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
    const [noMoreMessages, setNoMoreMessages] = useState(false);
    const [contactWithMessagesState, setContactWithMessagesState] = useState<ContactWithMessages>({} as ContactWithMessages);
    const [sections, setSections] = useState<Section[]>([]);
    const [textInputHeight, setTextInputHeight] = useState<number>(35);
    const [messageText, setMessageText] = useState<string>('');
    const [paddingTop, setPaddingTop] = useState<number>(0);
    const [showScrollIcon, setShowScrollIcon] = useState(false);
    const [isScrollIconLocked, setIsScrollIconLocked] = useState(false);
    const [showSeen, setShowSeen] = useState(false);
    const insets = useSafeAreaInsets();

    const sectionListRef: React.RefObject<SectionList> = useRef(null);
    const lastVisitedIndex = useRef<number>(15);
    const isMounted = useRef<boolean>(true);
    const currentScrollOffsetY = useRef<number>(0);
    const contactWithMessagesRef = useRef<ContactWithMessages>({} as ContactWithMessages);

    useEffect(
        () => {
            const loadMessages = route.params?.loadMessages;
            let contactWithMessages = route.params?.contactWithMessages;
            if (loadMessages) {
                api.getMessages(
                    globals.user.publicKey,
                    false,
                    false,
                    false,
                    false,
                    25,
                    'time',
                    ''
                ).then(
                    response => {
                        const messages: ContactWithMessages[] = response?.OrderedContactsWithMessages ? response.OrderedContactsWithMessages : [];
                        const newContactWithMessages = messages.find(
                            message => message?.PublicKeyBase58Check === contactWithMessages.PublicKeyBase58Check
                        );
                        if (newContactWithMessages) {
                            contactWithMessages = newContactWithMessages;
                        }
                        renderMessages(contactWithMessages);
                    }
                ).catch(error => globals.defaultHandleError(error));
            } else {
                renderMessages(contactWithMessages);
            }

            checkSeenState();
            const unsubscribeShowKeyboard = Keyboard.addListener('keyboardWillShow', keyboardWillShow);
            const unsubscribeHideKeyboard = Keyboard.addListener('keyboardWillHide', keyboardWillHide);
            return () => {
                isMounted.current = false;
                unsubscribeShowKeyboard.remove();
                unsubscribeHideKeyboard.remove();
            };
        },
        []
    );

    const checkSeenState = async () => {
        try {
            const fetchCount = 50;
            let found = false;
            let lastPublicKey = '';
            while (!found) {
                const response = await api.getMessages(
                    route.params.contactWithMessages.PublicKeyBase58Check,
                    false,
                    false,
                    false,
                    false,
                    fetchCount,
                    'time',
                    lastPublicKey
                );

                found = response.UnreadStateByContact[globals.user.publicKey] != null;
                if (found) {
                    const seen = response.UnreadStateByContact[globals.user.publicKey] === false;
                    setShowSeen(seen);
                }

                if (response.OrderedContactsWithMessages.length < fetchCount) {
                    break;
                }

                lastPublicKey = response.OrderedContactsWithMessages[response.OrderedContactsWithMessages.length - 1].PublicKeyBase58Check;
            }
        } catch {
        }
    };

    const keyboardWillShow = (event: KeyboardEvent): void => {
        setPaddingTop(event.endCoordinates.height - 25);
    };

    const keyboardWillHide = () => {
        setPaddingTop(0);
    };

    async function initializeSections(contactWithMessages: ContactWithMessages, slicedContacts?: ContactWithMessages) {
        const newSections: Section[] = sections;
        const targetContacts = newSections.length === 0 ? contactWithMessages : slicedContacts;
        const groupedMessages = groupMessagesByDay(targetContacts as ContactWithMessages);
        const keys = Object.keys(groupedMessages);

        for (const key of keys) {
            const messages = groupedMessages[key];

            const section = {
                date: key,
                data: messages
            };
            await handleMessagesDecryption(section);
            const dataFound = newSections.find((section: Section) => section.date === key);
            const targetSection = dataFound ? dataFound.data : messages;
            for (let i = 0; i < targetSection.length; i++) {
                if (i === 0 || (targetSection[i]?.IsSender !== targetSection[i - 1]?.IsSender)) {
                    targetSection[i].LastOfGroup = true;
                } else {
                    targetSection[i].LastOfGroup = false;
                }
            }

            if (dataFound) {
                dataFound.data.push(...section.data);
            }
            else {
                newSections.push(section);
            }

        }

        setSections(newSections);
        setLoading(false);
        setIsLoadingMore(false);
    }

    function renderMessages(contactWithMessages: ContactWithMessages): void {
        const contactWithMessagesCopy = JSON.parse(JSON.stringify(contactWithMessages));
        contactWithMessagesRef.current = contactWithMessages;
        const messagesCount = contactWithMessages.Messages.length;
        const initialBatch = 30;
        lastVisitedIndex.current = messagesCount - initialBatch;
        let slicedMessages = contactWithMessagesCopy.Messages.slice(lastVisitedIndex.current);
        if (initialBatch > messagesCount) {
            slicedMessages = contactWithMessagesCopy.Messages;
            setNoMoreMessages(true);
        }
        contactWithMessagesCopy.Messages = slicedMessages;
        setContactWithMessagesState(contactWithMessagesCopy);
        initializeSections(contactWithMessagesCopy);
    }

    function loadMoreMessages() {
        if (noMoreMessages || isLoadingMore) {
            return;
        }
        if (isMounted) {
            setIsLoadingMore(true);
        }
        const batchSize = 10;
        const contactWithMessages = JSON.parse(JSON.stringify(contactWithMessagesState));
        const decryptionTarget = JSON.parse(JSON.stringify(contactWithMessagesState));
        const startIndex = Math.max(lastVisitedIndex.current - batchSize, 0);
        const slicedMessages = contactWithMessagesRef.current.Messages.slice(startIndex, lastVisitedIndex.current);
        if (startIndex === 0) {
            setNoMoreMessages(true);
        }
        lastVisitedIndex.current = startIndex;
        contactWithMessages.Messages = slicedMessages.concat(contactWithMessages.Messages);
        decryptionTarget.Messages = slicedMessages;
        setContactWithMessagesState(contactWithMessages);
        initializeSections(contactWithMessages, decryptionTarget);
    }

    async function handleMessagesDecryption(section: Section): Promise<void> {
        let decryptedMessages: string[] = [];
        const promises: Promise<Message | undefined>[] = [];
        for (const message of section.data) {
            const promise = new Promise<Message | undefined>(
                (p_resolve) => {
                    getMessageText(message).then(
                        (response: any) => {
                            p_resolve(response);
                        }
                    ).catch(() => p_resolve(undefined));
                }
            );
            promises.push(promise);
        }
        decryptedMessages = await Promise.all(promises) as any;
        for (let j = 0; j < section.data.length; j++) {
            section.data[j].DecryptedText = decryptedMessages[j];
        }
    }

    function groupMessagesByDay(contactWithMessages: ContactWithMessages): { [key: string]: Message[] } {
        const dayMessagesMap: { [key: string]: Message[] } = {};
        if (contactWithMessages.Messages?.length > 0) {
            for (let i = contactWithMessages.Messages.length - 1; i >= 0; i--) {
                const messageDate = new Date(contactWithMessages.Messages[i].TstampNanos / 1000000);
                const formattedMessageDate = isToday(messageDate) ?
                    'Today' :
                    messageDate.toLocaleDateString(
                        'en-US',
                        { weekday: 'short', month: 'short', day: 'numeric' }
                    );

                if (!dayMessagesMap[formattedMessageDate]) {
                    dayMessagesMap[formattedMessageDate] = [];
                }
                dayMessagesMap[formattedMessageDate].push(contactWithMessages.Messages[i]);
            }
        }
        return dayMessagesMap;
    }

    function isToday(date: Date): boolean {
        const today = new Date();
        return date.getDate() == today.getDate() &&
            date.getMonth() == today.getMonth() &&
            date.getFullYear() == today.getFullYear();
    }

    async function onSendMessage(): Promise<void> {
        if (messageText.trim().length === 0) {
            return;
        }
        const contactWithMessages = route.params?.contactWithMessages;
        const timeStampNanos = new Date().getTime() * 1000000;
        const message: Message = {
            DecryptedText: messageText,
            EncryptedText: '',
            IsSender: true,
            RecipientPublicKeyBase58Check: contactWithMessages.PublicKeyBase58Check,
            SenderPublicKeyBase58Check: globals.user.publicKey,
            TstampNanos: timeStampNanos,
            LastOfGroup: true,
            V2: true
        };

        let todaySection: Section = {
            date: 'Today',
            data: []
        };

        if (sections.length > 0 && sections[0].date === 'Today') {
            todaySection = sections[0];
        }

        if (todaySection.data.length > 0) {
            const lastMessage: Message = todaySection.data[0];
            if (lastMessage.IsSender) {
                lastMessage.LastOfGroup = false;
            }
        } else {
            sections.unshift(todaySection);
        }

        todaySection.data.unshift(message);
        const Messages = [...contactWithMessagesRef.current.Messages, message];
        setContactWithMessagesState((prevState) => ({ ...prevState, Messages }));
        eventManager.dispatchEvent(EventType.UpdateContactsWithMessages, { message });
        setMessageText('');

        if (sections.length === 0) {
            const newSection = [
                {
                    date: 'Today',
                    data: [message]
                }
            ];
            setSections(newSection);
        } else {
            setSections(sections);
        }
        if (sections.length > 0) {
            scrollToBottom();
        }
        setShowSeen(false);

        try {
            const encryptedMessage = await signing.encryptShared(contactWithMessages.PublicKeyBase58Check, messageText);
            const response = await api.sendMessage(globals.user.publicKey, contactWithMessages.PublicKeyBase58Check, encryptedMessage);
            const transactionHex = response.TransactionHex;
            const signedTransactionHex = await signing.signTransaction(transactionHex);
            await api.submitTransaction(signedTransactionHex);
        } catch (exception) {
            globals.defaultHandleError(exception);
        }
    }

    function scrollToBottom(): void {
        if (sectionListRef?.current && sections?.length > 0) {
            setShowScrollIcon(false);
            setIsScrollIconLocked(true);
            try {
                sectionListRef.current.scrollToLocation({ itemIndex: 0, sectionIndex: 0, animated: true });
            } catch { }
        }
    }

    function onScroll(event: any) {
        const scrollOffset = event.nativeEvent.contentOffset.y;
        currentScrollOffsetY.current = scrollOffset;
        if (isMounted.current) {
            if (scrollOffset < 10) {
                setIsScrollIconLocked(false);
            }
            if (scrollOffset > screenHeight * 0.6 && !isScrollIconLocked) {
                setShowScrollIcon(true);
            } else {
                setShowScrollIcon(false);
            }
        }
    }

    const keyExtractor = (item: Message, index: number) => `${item.SenderPublicKeyBase58Check}_${item.TstampNanos}_${index.toString()}`;
    const renderItem = ({ item }: { item: Message }) => <View style={{ flexDirection: 'row' }}>
        <MessageComponent message={item} />
    </View>;

    const renderSectionDate = ({ section: { date } }: any): JSX.Element => <Text style={[styles.dateText, themeStyles.fontColorSub]}>{date}</Text>;
    const renderFooter = isLoadingMore ? <ActivityIndicator color={themeStyles.fontColorMain.color} /> : <></>;
    const renderHeader = contactWithMessagesState?.Messages?.length > 0 &&
        contactWithMessagesState.Messages[contactWithMessagesState.Messages.length - 1].IsSender &&
        showSeen ?
        <Text style={[styles.seenText, themeStyles.fontColorSub]}>seen</Text> : <></>;

    const keyboardBehavior = Platform.OS === 'ios' ? 'position' : undefined;
    const keyboardVerticalOffset = Platform.OS === 'ios' ? 70 + insets.bottom : 0;

    return isLoading ?
        <CloutFeedLoader />
        :
        <View style={[{ flex: 1, paddingBottom: insets.bottom + 12 }, themeStyles.containerColorMain]} >
            <KeyboardAvoidingView
                behavior={keyboardBehavior}
                style={[{ flex: 1 }, themeStyles.containerColorMain]}
                keyboardVerticalOffset={keyboardVerticalOffset}
            >
                <View style={[styles.container, { paddingTop }]}>
                    <SectionList
                        inverted
                        onScroll={onScroll}
                        style={{ transform: [{ scaleY: -1 }] }}
                        contentContainerStyle={styles.flatListStyle}
                        ref={sectionListRef}
                        onScrollToIndexFailed={() => { undefined; }}
                        showsVerticalScrollIndicator={false}
                        initialNumToRender={5}
                        invertStickyHeaders={false}
                        onEndReachedThreshold={3}
                        onEndReached={loadMoreMessages}
                        ListFooterComponent={renderFooter}
                        ListHeaderComponent={renderHeader}
                        sections={sections}
                        keyExtractor={keyExtractor}
                        renderItem={renderItem}
                        renderSectionFooter={renderSectionDate}
                    />
                    <ChatInputComponent
                        messageText={messageText}
                        setMessageText={setMessageText}
                        textInputHeight={textInputHeight}
                        setTextInputHeight={setTextInputHeight}
                        onSendMessage={onSendMessage}
                    />

                    {
                        showScrollIcon && <TouchableOpacity
                            onPress={scrollToBottom}
                            activeOpacity={1}
                            style={
                                [
                                    styles.floatingArrow,
                                    { bottom: textInputHeight + 60 },
                                    themeStyles.containerColorSub
                                ]
                            }>
                            <EvilIcons name="arrow-down" size={30} color={themeStyles.verificationBadgeBackgroundColor.backgroundColor} />
                        </TouchableOpacity>
                    }

                </View>
            </KeyboardAvoidingView>
        </View >;
}

const styles = StyleSheet.create(
    {
        container: {
            marginTop: 1,
            width: '100%',
            height: '100%'
        },
        flatListStyle: {
            flexGrow: 1,
            justifyContent: 'flex-end',
            paddingTop: 5,
            paddingBottom: 10,
        },
        dateText: {
            marginVertical: 12,
            fontSize: 11,
            fontWeight: '700',
            textAlign: 'center'
        },
        floatingArrow: {
            position: 'absolute',
            bottom: 15,
            right: 0,
            width: 50,
            height: 35,
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 8
        },
        seenText: {
            marginLeft: 'auto',
            marginRight: 10,
            fontSize: 10,
            marginBottom: 4,
            marginTop: -2
        }
    }
);
