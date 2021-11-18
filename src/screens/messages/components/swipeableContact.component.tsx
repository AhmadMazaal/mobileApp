import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { themeStyles } from '@styles/globalColors';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { ContactMessagesListCardComponent } from './contactMessagesListCard.component';
import { ContactWithMessages } from '@types';

export default function SwipeableContactComponent(
    { swipeTitle, contact, filterContacts }:
        { swipeTitle: string, contact: ContactWithMessages, filterContacts: (recipientPublicKey: string) => void, index: number }): JSX.Element {

    const renderRightActions = (): JSX.Element => <View style={[styles.archiveBox, themeStyles.borderColor]}>
        <View style={{ alignItems: 'center' }}>
            <Ionicons name="archive-outline" size={24} color="white" />
            <Text style={[styles.archiveBoxText]}>{swipeTitle}</Text>
        </View>
    </View>;

    return <Swipeable
        onSwipeableRightOpen={() => filterContacts(contact?.PublicKeyBase58Check)}
        renderRightActions={renderRightActions}
    >
        <ContactMessagesListCardComponent contactWithMessages={contact} />
    </Swipeable>;
}

const styles = StyleSheet.create(
    {
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
        }
    }
);
