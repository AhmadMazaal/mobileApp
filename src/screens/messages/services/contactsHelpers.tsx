import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ContactWithMessages } from '@types';
import { globals } from '@globals/globals';
import { constants } from '@globals/constants';

export async function filterContacts(contacts: ContactWithMessages[], p_recipientPublicKey: string, isRemove = false): Promise<any> {
    const key = `${globals.user.publicKey}${constants.localStorage_archivedChats}`;
    const chatKeys = `${globals.user.publicKey}${constants.localStorage_archivedChatsRecipientKeys}`;
    let parsedOldArchivedChats = [];
    let parsedOldRecipientPublicKeys = [];
    let stringifiedFilteredContact = '';
    let removedContact = {} as ContactWithMessages;
    let recipientPublicKeys = '';
    let filteredContacts;
    try {
        const responses = await Promise.all(
            [
                AsyncStorage.getItem(key),
                SecureStore.getItemAsync(chatKeys)
            ]
        );

        if (responses[0] && responses[1]) {
            parsedOldArchivedChats = JSON.parse(responses[0]);
            parsedOldRecipientPublicKeys = JSON.parse(responses[1]);
        }

        if (isRemove) {
            const filteredRecipientKeys = parsedOldRecipientPublicKeys.filter((publicKey: string) => publicKey !== p_recipientPublicKey);
            filteredContacts = parsedOldArchivedChats.filter(
                (contact: ContactWithMessages) => {
                    if (contact.PublicKeyBase58Check !== p_recipientPublicKey) {
                        return true;
                    } else {
                        removedContact = contact;
                    }
                }
            );
            stringifiedFilteredContact = JSON.stringify(filteredContacts);
            recipientPublicKeys = JSON.stringify(filteredRecipientKeys);

        } else {
            filteredContacts = contacts.filter(
                (contact: ContactWithMessages) => {
                    if (contact.PublicKeyBase58Check !== p_recipientPublicKey) {
                        return true;
                    } else {
                        removedContact = contact;
                    }
                }
            );
            stringifiedFilteredContact = JSON.stringify([...parsedOldArchivedChats, removedContact]);
            recipientPublicKeys = JSON.stringify([...parsedOldRecipientPublicKeys, p_recipientPublicKey]);
        }

        await Promise.all(
            [
                AsyncStorage.setItem(key, stringifiedFilteredContact),
                SecureStore.setItemAsync(chatKeys, recipientPublicKeys)
            ]
        );

        return { filteredContacts, removedContact };
    } catch { }

}
