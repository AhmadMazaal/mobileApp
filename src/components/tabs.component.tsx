import React from 'react';
import { Dimensions, StyleSheet, Text } from 'react-native';
import { ScrollView, TouchableOpacity } from 'react-native-gesture-handler';
import { themeStyles } from '@styles';

export interface TabConfig {
    name: string;
}

interface Props {
    tabs: TabConfig[];
    selectedTab: string;
    onTabClick: (p_tabName: string) => void;
    centerText?: boolean;
}

export function TabsComponent({ tabs, selectedTab, onTabClick, centerText }: Props): JSX.Element {

    return <ScrollView
        style={[styles.container, themeStyles.containerColorMain]}
        horizontal
        contentContainerStyle={styles.containerContent}
        showsHorizontalScrollIndicator={false}
        bounces={false}
    >
        {
            tabs.map(
                p_tab => <TouchableOpacity
                    key={p_tab.name}
                    style={[
                        styles.tab,
                        selectedTab === p_tab.name ? { borderBottomWidth: 2, borderBottomColor: themeStyles.fontColorMain.color } : {},
                        centerText === true ? { alignItems: 'center', width: Dimensions.get('window').width / tabs.length } : {}
                    ]}
                    activeOpacity={1}
                    onPress={() => onTabClick(p_tab.name)}>
                    <Text style={[
                        styles.tabText,
                        selectedTab === p_tab.name ? styles.selectedTabText : {},
                        selectedTab === p_tab.name ? themeStyles.fontColorMain : themeStyles.fontColorSub
                    ]}>{p_tab.name}</Text>
                </TouchableOpacity>
            )
        }
    </ScrollView>;
}

const styles = StyleSheet.create(
    {
        container: {
            height: 40,
            width: '100%'
        },
        containerContent: {
            alignItems: 'center',
            height: 40,
            // backgroundColor: 'blue'
        },
        tab: {
            height: 40,
            paddingLeft: 10,
            paddingRight: 10
        },
        tabText: {
            fontWeight: '500',
            paddingTop: 10,
            fontSize: 15
        },
        selectedTabText: {
            fontWeight: 'bold',
        }
    }
);
