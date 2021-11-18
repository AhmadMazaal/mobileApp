import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { MessageTopHoldersOptionsScreen } from '@screens/messageTopHolders/messageTopHoldersOptions';
import { MessageTopHoldersInputScreen } from '@screens/messageTopHolders/messageTopHoldersInput';
import { ChatHeaderComponent } from '@components/chatHeader.component';
import { MessagesHeaderComponent } from '@screens/messages/components/messagesHeader';
import { eventManager } from '@globals';
import { themeStyles } from '@styles';
import { MessagesScreen } from '@screens/messages/messages.screen';
import { stackConfig } from './stackNavigationConfig';
import CloutFeedButton from '@components/cloutfeedButton.component';
import { EventType } from '@types';
import { SharedStackScreens } from './sharedStackScreens';
import { ChatScreen } from '@screens/chat/chat.screen';
import ArchivedMessagesScreen from '@screens/messages/archivedMessages.screen';

const MessageStack = createStackNavigator();

export default function MessageStackScreen() {
    return (
        <MessageStack.Navigator
            screenOptions={({ navigation }: any) => ({
                ...stackConfig,
                headerTitleStyle: { alignSelf: 'center', color: themeStyles.fontColorMain.color, marginRight: Platform.OS === 'ios' ? 0 : 50 },
                headerStyle: {
                    backgroundColor: themeStyles.containerColorMain.backgroundColor,
                    shadowOpacity: 0,
                    elevation: 0
                },
                headerLeft: () => <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={1}>
                    <Ionicons name="chevron-back" size={32} color="#007ef5" />
                </TouchableOpacity>
            })}
        >
            <MessageStack.Screen
                options={{
                    headerTitleStyle: {
                        alignSelf: 'center',
                        color: themeStyles.fontColorMain.color
                    },
                    headerRight: () => <MessagesHeaderComponent />,
                }}
                name="Messages"
                component={MessagesScreen}
            />

            <MessageStack.Screen
                options={{
                    headerTitle: 'Broadcast',
                    headerBackTitle: ' ',
                }}
                name="MessageTopHoldersOptions"
                component={MessageTopHoldersOptionsScreen}
            />

            <MessageStack.Screen
                options={{
                    headerTitle: 'Broadcast',
                    headerBackTitle: ' ',
                    headerRight: () => <CloutFeedButton
                        title={'Send'}
                        onPress={() => eventManager.dispatchEvent(EventType.BroadcastMessage)}
                        styles={styles.postButton}
                    />
                }}
                name="MessageTopHoldersInput"
                component={MessageTopHoldersInputScreen}
            />

            <MessageStack.Screen
                options={({ route }) => (
                    {
                        title: ' ',
                        headerBackTitle: ' ',
                        headerLeft: () => (
                            route.params &&
                            <ChatHeaderComponent contactWithMessages={(route.params as any).contactWithMessages} />
                        )
                    }
                )}
                name="Chat"
                component={ChatScreen}
            />
            <MessageStack.Screen
                options={
                    () => (
                        {
                            headerTitle: 'Archived Chat',
                        }
                    )
                }
                name="ArchivedMessages"
                component={ArchivedMessagesScreen}
            />

            {
                SharedStackScreens.map((item: any, index: number) => <MessageStack.Screen
                    key={`${item.name as string}_${index}`}
                    options={item.options}
                    name={item.name}
                    component={item.component}
                />
                )
            }

        </MessageStack.Navigator>
    );
}

const styles = StyleSheet.create(
    {
        postButton: {
            marginRight: 10,
        },

    }
);
