import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ContactWithMessages } from '@types';
import { ParamListBase, useNavigation } from '@react-navigation/native';
import { globals } from '@globals';
import { api, calculateDurationUntilNow } from '@services';
import { themeStyles } from '@styles';
import { signing } from '@services/authorization/signing';
import MessageInfoCardComponent from '@components/profileInfo/messageInfoCard.component';
import { StackNavigationProp } from '@react-navigation/stack';

export function ContactMessagesListCardComponent(
    { contactWithMessages, index }: { contactWithMessages: ContactWithMessages, index: number }
): JSX.Element {
    const [showCreatorCoinHolding, setShowCreatorCoinHolding] = useState<boolean>(false);
    const [unreadMessages, setUnreadMessages] = useState<boolean>(false);
    const navigation = useNavigation<StackNavigationProp<ParamListBase>>();
    const isMounted = useRef<boolean>(true);

    useEffect(
        () => {
            setShowCreatorCoinHolding(
                (contactWithMessages.CreatorCoinHoldingAmount as number) > 0 && globals.investorFeatures
            );
            setUnreadMessages(contactWithMessages.UnreadMessages as boolean);
            return () => {
                isMounted.current = false;
            };
        },
        []
    );

    async function goToChat() {
        if (contactWithMessages.UnreadMessages) {

            try {
                const jwt = await signing.signJWT();
                api.markContactMessagesRead(
                    globals.user.publicKey, contactWithMessages.PublicKeyBase58Check, jwt
                );
                contactWithMessages.UnreadMessages = false;
                setUnreadMessages(false);
            } catch { undefined; }
        }

        navigation.navigate(
            'MessageStack',
            {
                screen: 'Chat',
                params: {
                    contactIndex: index,
                    contactWithMessages: contactWithMessages
                }
            }
        );
    }
    let duration = '';
    const lastMessage = contactWithMessages.Messages?.length > 0 ?
        contactWithMessages.Messages[contactWithMessages.Messages.length - 1] : undefined;
    if (lastMessage) {
        duration = calculateDurationUntilNow(lastMessage?.TstampNanos);
    }
    return <TouchableOpacity style={[styles.touchableContainer, themeStyles.containerColorMain, themeStyles.borderColor]} activeOpacity={0.8} onPress={goToChat}>
        <View style={styles.container}>
            <MessageInfoCardComponent
                customAction={goToChat}
                navigation={navigation}
                profile={contactWithMessages.ProfileEntryResponse}
                lastMessage={contactWithMessages.LastDecryptedMessage}
                duration={duration}
                showCreatorCoinHolding={showCreatorCoinHolding}
                isLarge={false}
            />
            {unreadMessages ? <View style={[styles.unreadMessagesCountContainer]} /> : undefined}
        </View>
    </TouchableOpacity >;
}

const styles = StyleSheet.create(
    {
        touchableContainer: {
            width: '100%',
            height: 65,
            borderBottomWidth: 1
        },
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            height: 65,
            paddingHorizontal: 10,
        },
        unreadMessagesCountContainer: {
            minWidth: 10,
            height: 10,
            borderRadius: 20,
            marginLeft: 'auto',
            marginRight: 10,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#007ef5'
        }
    }
);
