import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Feather } from '@expo/vector-icons';
import { PostScreen } from '@screens/post.screen';
import { SearchScreen } from '@screens/search.screen';
import { SearchHeaderComponent } from '@components/searchHeader';
import { globals } from '@globals';
import { themeStyles } from '@styles';
import { IdentityScreen } from '@screens/login/identity.screen';
import { HomeScreen } from '@screens/home/home.screen';
import { ProfileScreen } from '@screens/profile/profile.screen';
import EditProfileScreen from '@screens/profile/editProfile.screen';
import { ProfileFollowersScreen } from '@screens/profileFollowers.screen';
import { CreatorCoinScreen } from '@screens/creatorCoin/creatorCoin.screen';
import { CreatePostScreen } from '@screens/createPost.screen';
import { LogoHeaderComponent } from '@components/logoHeader.component';
import { PostStatsScreen } from '@screens/postStats/postStats.screen';

const HomeStack = createStackNavigator();

export default function HomeStackScreen() {
    return (
        <HomeStack.Navigator
            screenOptions={({ navigation }: any) => ({
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
            <HomeStack.Screen
                options={
                    ({ navigation }) => ({
                        headerTitle: ' ',
                        headerBackTitle: ' ',
                        headerLeft: () => <LogoHeaderComponent></LogoHeaderComponent>,
                        headerRight: () => (
                            <View style={{ flexDirection: 'row' }}>
                                <TouchableOpacity
                                    style={{ marginRight: 8, paddingRight: 4, paddingLeft: 4 }}
                                    onPress={() => navigation.navigate('Search')}
                                >
                                    <Ionicons name="ios-search" size={26} color={themeStyles.fontColorMain.color} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{ marginRight: 8, paddingRight: 4, paddingLeft: 4 }}
                                    onPress={() => navigation.navigate('MessageStack')}
                                >
                                    <Feather name="send" size={26} color={themeStyles.fontColorMain.color} />
                                </TouchableOpacity>
                            </View>
                        ),
                    })
                }
                name="Home"
                component={HomeScreen}
            />

            <HomeStack.Screen
                options={{
                    headerTitle: 'CloutFeed',
                    headerBackTitle: ' '
                }}
                name="UserProfile"
                component={ProfileScreen}
            ></HomeStack.Screen>

            <HomeStack.Screen
                options={{
                    headerTitle: 'Edit Profile',
                    headerBackTitle: ' '
                }}
                name="EditProfile"
                component={EditProfileScreen}
            ></HomeStack.Screen>

            <HomeStack.Screen
                options={
                    ({ route }) => (
                        {
                            title: route.params ? (route.params as any).username : 'Profile',
                            headerBackTitle: ' '
                        }
                    )
                }
                name="ProfileFollowers"
                component={ProfileFollowersScreen}
            ></HomeStack.Screen>

            <HomeStack.Screen
                options={
                    ({ route }) => (
                        {
                            title: route.params ? '$' + (route.params as any).username : 'Creator Coin',
                            headerTitleStyle: { fontSize: 20, alignSelf: 'center', color: themeStyles.fontColorMain.color, marginRight: Platform.OS === 'ios' ? 0 : 50 },
                            headerBackTitle: ' '
                        }
                    )
                }
                name="CreatorCoin"
                component={CreatorCoinScreen}
            ></HomeStack.Screen>

            <HomeStack.Screen
                options={
                    ({ route }) => (
                        {
                            headerTitle: (route.params as any).newPost ? 'New Post' : (route.params as any).comment ? 'New Comment' :
                                (route.params as any).editPost ? 'Edit Post' : 'Reclout Post',
                            headerBackTitle: 'Cancel',
                            headerRight: () => (
                                <TouchableOpacity
                                    style={[styles.postButton, themeStyles.buttonBorderColor]}
                                    onPress={() => globals.createPost()}
                                >
                                    <Text style={styles.postButtonText}>Post</Text>
                                </TouchableOpacity>
                            )
                        }
                    )}
                name="CreatePost"
                component={CreatePostScreen}
            ></HomeStack.Screen>

            <HomeStack.Screen
                options={{
                    headerTitle: 'CloutFeed',
                    headerBackTitle: ' '
                }}
                name="Post"
                component={PostScreen}
            ></HomeStack.Screen>

            <HomeStack.Screen
                options={{
                    headerTitle: 'CloutFeed',
                    headerBackTitle: ' '
                }}
                name="PostStats"
                component={PostStatsScreen}
            ></HomeStack.Screen>

            <HomeStack.Screen
                options={{
                    headerTitle: ' ',
                    headerLeft: () => <SearchHeaderComponent></SearchHeaderComponent>,
                    headerBackTitle: ' ',
                }}
                name="Search"
                component={SearchScreen}
            ></HomeStack.Screen>

            <HomeStack.Screen
                options={
                    {
                        headerStyle: { backgroundColor: '#121212', shadowRadius: 0, shadowOffset: { height: 0, width: 0 } },
                        headerTitleStyle: { color: 'white', fontSize: 20 }
                    }
                }
                name="Identity" component={IdentityScreen}
            ></HomeStack.Screen>
        </HomeStack.Navigator>
    )
};


const styles = StyleSheet.create(
    {
        postButton: {
            backgroundColor: 'black',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 10,
            paddingRight: 12,
            paddingLeft: 12,
            paddingTop: 6,
            paddingBottom: 6,
            borderRadius: 4,
            borderWidth: 1
        },
        postButtonText: {
            color: 'white'
        }
    }
)