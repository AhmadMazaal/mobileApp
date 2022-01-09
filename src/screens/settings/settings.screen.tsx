import React from 'react';
import { Text, View, StyleSheet, FlatList, Linking } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { themeStyles } from '@styles';
import { globals } from '@globals';
import { Entypo, Ionicons, Feather, SimpleLineIcons, MaterialCommunityIcons, AntDesign } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { ParamListBase } from '@react-navigation/native';

interface Settings {
    title: string;
    icon: JSX.Element;
    action: () => void;
}

interface Props {
    navigation: StackNavigationProp<ParamListBase>
}

export function SettingsScreen({ navigation }: Props) {

    const settings: Settings[] = [
        {
            title: 'Preferences',
            icon: <Ionicons name="options-outline" size={24} color={themeStyles.fontColorMain.color} />,
            action: () => navigation.navigate('Preferences')
        },
        {
            title: 'Notifications',
            icon: <Ionicons name="md-notifications-outline" size={28} color={themeStyles.fontColorMain.color} />,
            action: () => navigation.navigate('NotificationsSettings')
        },
        {
            title: 'Haptics',
            icon: <MaterialCommunityIcons name="vibrate" size={24} color={themeStyles.fontColorMain.color} />,
            action: () => navigation.navigate('HapticsSettings')
        },
        {
            title: 'Saved Posts',
            icon: <Feather name="bookmark" size={24} color={themeStyles.fontColorMain.color} />,
            action: () => navigation.navigate('SavedPosts')
        },
        {
            title: 'Blocked Users',
            icon: <Entypo name="block" size={24} color={themeStyles.fontColorMain.color} />,
            action: () => navigation.navigate('BlockedUsers')
        },
        {
            title: 'Privacy Policy',
            icon: <Feather name="lock" size={24} color={themeStyles.fontColorMain.color} />,
            action: () => Linking.openURL('https://clouttechnologies.com/privacy-policy')
        },
        {
            title: 'Terms & Conditions',
            icon: <MaterialCommunityIcons name="text-box-check-outline" size={24} color={themeStyles.fontColorMain.color} />,
            action: () => Linking.openURL('https://clouttechnologies.com/terms-%26-conditions')
        },
        {
            title: 'Contact Us',
            icon: <Ionicons name="mail-unread-outline" size={24} color={themeStyles.fontColorMain.color} />,
            action: () => Linking.openURL('https://clouttechnologies.com/home')
        },
        {
            title: 'Logout',
            icon: <SimpleLineIcons name="logout" size={24} color={themeStyles.fontColorMain.color} />,
            action: () => globals.onLogout()
        },
        {
            title: 'CloutFeed v 1.6.7',
            icon: <AntDesign name="copyright" style={styles.iconMargin} size={24} color={themeStyles.fontColorMain.color} />,
            action: () => { return; }
        }
    ];

    const keyExtractor = (item: Settings, index: number) => item.toString() + index.toString();

    const renderItem = (p_item: Settings) => {
        return <TouchableOpacity
            style={[styles.buttonContainer, themeStyles.containerColorMain, themeStyles.borderColor]}
            onPress={p_item.action}
            activeOpacity={1}>
            {p_item.icon}
            <Text style={[styles.buttonText, themeStyles.fontColorMain]}>{p_item.title}</Text>
        </TouchableOpacity>;
    };

    return (
        <View style={[styles.container, themeStyles.containerColorMain]}>
            <FlatList
                data={settings}
                initialNumToRender={11}
                renderItem={({ item }) => renderItem(item)}
                keyExtractor={keyExtractor}
            />
        </View>
    );
}

const styles = StyleSheet.create(
    {
        container: {
            flex: 1
        },
        buttonContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            borderBottomWidth: 1
        },
        buttonText: {
            marginLeft: 12,
            fontWeight: '600'
        },
        iconMargin: {
            marginLeft: 6
        }
    }
);
