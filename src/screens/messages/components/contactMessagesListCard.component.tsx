import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Text, Dimensions } from 'react-native';
import { ContactWithMessages } from '@types';
import { ParamListBase, useNavigation } from '@react-navigation/native';
import { globals } from '@globals';
import { api, calculateDurationUntilNow } from '@services';
import { themeStyles } from '@styles';
import { signing } from '@services/authorization/signing';
import { MaterialIcons, AntDesign } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';

export function ContactMessagesListCardComponent(
    { contactWithMessages }: { contactWithMessages: ContactWithMessages }
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
            <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity activeOpacity={1}>
                    <Image style={[styles.image,]} source={{ uri: contactWithMessages?.ProfileEntryResponse.ProfilePic }} />
                </TouchableOpacity>
                <View>
                    <View style={{ flexDirection: 'row' }}>
                        <Text style={
                            [
                                styles.username,
                                themeStyles.fontColorMain,
                            ]
                        }>
                            {contactWithMessages.ProfileEntryResponse?.Username}
                        </Text>
                        {
                            contactWithMessages.ProfileEntryResponse?.IsVerified &&
                            <MaterialIcons name="verified" size={16} style={styles.verified} color="#007ef5" />
                        }
                        {
                            showCreatorCoinHolding &&
                            <AntDesign style={styles.starIcon} name={'star'} size={15} color={'#ffdb58'} />
                        }
                    </View>
                    <View style={styles.bottomRow}>
                        <Text style={[styles.lastMessage, themeStyles.fontColorSub]} numberOfLines={1}>{contactWithMessages.LastDecryptedMessage}</Text>
                        <Text style={[styles.lastMessage, themeStyles.fontColorSub]}> • {duration}</Text>
                    </View>
                </View>
            </View>

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
        },
        image: {
            width: 40,
            height: 40,
            borderRadius: 6,
            marginRight: 12
        },
        verified: {
            marginLeft: 5,
        },
        username: {
            fontWeight: '700',
            maxWidth: Dimensions.get('window').width / 2
        },
        starIcon: {
            marginBottom: 3
        },
        bottomRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 2,
        },
        lastMessage: {
            fontSize: 13,
            maxWidth: Dimensions.get('window').width * 0.5,
        },
    }
);
