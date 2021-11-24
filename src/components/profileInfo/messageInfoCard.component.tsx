import React from 'react';
import { Dimensions, StyleSheet, View, Text } from 'react-native';
import ProfileInfoImageComponent from './profileInfoImage.component';
import ProfileInfoUsernameComponent from './profileInfoUsername.component';
import { themeStyles } from '@styles/globalColors';
import { Profile } from '@types';
import { StackNavigationProp } from '@react-navigation/stack';
import { ParamListBase } from '@react-navigation/native';

interface Props {
    profile: Profile;
    navigation: StackNavigationProp<ParamListBase>;
    lastMessage?: string;
    duration?: string;
    showCreatorCoinHolding?: boolean;
    isLarge: boolean;
    imageSize?: number;
    peekDisabled?: boolean;
    customAction?: () => void
}

export default class MessageInfoCardComponent extends React.Component<Props> {

    constructor(props: Props) {
        super(props);
    }

    shouldComponentUpdate(nextProps: Props): boolean {
        return this.props.profile !== nextProps.profile ||
            this.props.lastMessage !== nextProps.lastMessage;
    }

    render(): JSX.Element {
        return <View style={styles.container}>
            <ProfileInfoImageComponent
                customAction={this.props.customAction}
                peekDisabled={this.props.peekDisabled}
                navigation={this.props.navigation}
                imageSize={this.props.imageSize}
                profile={this.props.profile} />
            <View>
                <ProfileInfoUsernameComponent
                    customAction={this.props.customAction}
                    peekDisabled={this.props.peekDisabled}
                    isLarge={this.props.isLarge}
                    showCreatorCoinHolding={this.props.showCreatorCoinHolding}
                    profile={this.props.profile}
                    navigation={this.props.navigation}

                />
                {
                    !!this.props.lastMessage &&
                    <View style={styles.bottomRow}>
                        <Text style={[styles.lastMessage, themeStyles.fontColorSub]} numberOfLines={1}>{this.props.lastMessage}</Text>
                        <Text style={[styles.lastMessage, themeStyles.fontColorSub]}> • {this.props.duration}</Text>
                    </View>
                }
            </View>
        </View>;
    }
}

const styles = StyleSheet.create(
    {
        container: {
            flexDirection: 'row',
            alignItems: 'center'
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
