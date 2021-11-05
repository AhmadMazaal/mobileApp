import React from 'react';
import { Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { themeStyles } from '@styles/globalColors';
import { MaterialIcons, AntDesign } from '@expo/vector-icons';
import { EventType, Profile } from '@types';
import { eventManager, hapticsManager } from '@globals/injector';
import { StackNavigationProp } from '@react-navigation/stack';
import { ParamListBase } from '@react-navigation/native';
import { calculateDeSoInUSD } from '@services/deSoCalculator';

interface Props {
    profile: Profile;
    showCreatorCoinHolding?: boolean;
    isLarge?: boolean;
    isDarkMode?: boolean;
    navigation: StackNavigationProp<ParamListBase>;
    peekDisabled?: boolean;
    customAction?: () => void;
}

export default class ProfileInfoUsernameComponent extends React.Component<Props> {

    constructor(props: Props) {
        super(props);

        this.toggleProfileCardModal = this.toggleProfileCardModal.bind(this);
        this.goToProfile = this.goToProfile.bind(this);
    }

    shouldComponentUpdate(nextProps: Props): boolean {
        return this.props.profile !== nextProps.profile;
    }

    private goToProfile(): void {
        if (this.props.customAction) {
            this.props.customAction();
            return;
        }
        if (this.props.peekDisabled) {
            return;
        }

        if (this.props.profile &&
            this.props.profile?.Username !== 'anonymous') {
            this.props.navigation.push(
                'UserProfile',
                {
                    publicKey: this.props.profile?.PublicKeyBase58Check,
                    username: this.props.profile?.Username,
                    key: 'Profile_' + this.props.profile?.PublicKeyBase58Check
                }
            );
        }
    }

    private toggleProfileCardModal(): void {
        if (this.props.peekDisabled) {
            return;
        }
        hapticsManager.customizedImpact();
        eventManager.dispatchEvent(EventType.ToggleProfileInfoModal,
            {
                visible: true,
                profile: this.props.profile,
                coinPrice: calculateDeSoInUSD(this.props.profile?.CoinPriceDeSoNanos),
                navigation: this.props.navigation
            }
        );
    }

    render(): JSX.Element {
        return <TouchableOpacity
            onPress={this.goToProfile}
            onLongPress={this.toggleProfileCardModal}
            activeOpacity={1}
            style={styles.container}>
            <Text style={
                [
                    styles.username,
                    this.props.isDarkMode ?
                        styles.darkText
                        : themeStyles.fontColorMain,
                    this.props.isLarge && styles.chatHeaderUsername,
                ]
            }>
                {this.props.profile?.Username}
            </Text>
            {
                this.props.profile?.IsVerified &&
                <MaterialIcons name="verified" size={16} style={styles.verified} color="#007ef5" />
            }
            {
                !!this.props.showCreatorCoinHolding &&
                <AntDesign style={styles.starIcon} name={'star'} size={15} color={'#ffdb58'} />
            }
        </TouchableOpacity>;
    }
}

const styles = StyleSheet.create(
    {
        container: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        username: {
            fontWeight: '700',
            maxWidth: Dimensions.get('window').width / 2
        },
        verified: {
            marginLeft: 5,
        },
        starIcon: {
            marginBottom: 3
        },
        chatHeaderUsername: {
            fontSize: 16,
        },
        darkText: {
            color: '#ebebeb'
        }
    }
);
