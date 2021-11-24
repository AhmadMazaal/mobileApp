import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { themeStyles } from '@styles/globalColors';
import ProfileInfoImageComponent from './profileInfoImage.component';
import ProfileInfoUsernameComponent from './profileInfoUsername.component';
import CoinPriceComponent from './coinPrice.component';
import { Ionicons } from '@expo/vector-icons';
import { calculateAndFormatDeSoInUsd } from '@services/deSoCalculator';
import { EventType, Profile, ToggleHideCoinPriceEvent } from '@types';
import { StackNavigationProp } from '@react-navigation/stack';
import { ParamListBase } from '@react-navigation/native';
import { eventManager, globals } from '@globals';

interface Props {
    profile: Profile;
    duration?: string;
    isProfileManager?: boolean;
    ìsDarkMode?: boolean;
    imageSize?: number;
    navigation: StackNavigationProp<ParamListBase>;
    peekDisabled?: boolean;
    noCoinPrice?: boolean;
    customAction?: () => void;
}

interface State {
    isCoinPriceHidden: boolean;
}

export default class ProfileInfoCardComponent extends React.Component<Props, State> {

    private _isMounted = false;

    private _unsubscribeHideCoinPriceEvent: () => void = () => undefined;

    constructor(props: Props) {
        super(props);

        this.state = {
            isCoinPriceHidden: globals.isCoinPriceHidden
        };

        this.subscribeToggleHideCoinPrice();
    }

    componentDidMount(): void {
        this._isMounted = true;
    }

    componentWillUnmount(): void {
        this._unsubscribeHideCoinPriceEvent();
    }

    private subscribeToggleHideCoinPrice(): void {
        this._unsubscribeHideCoinPriceEvent = eventManager.addEventListener(
            EventType.ToggleHideCoinPrice,
            (event: ToggleHideCoinPriceEvent) => {
                if (this._isMounted) {
                    this.setState(
                        {
                            isCoinPriceHidden: event.hidden
                        }
                    );
                }
            }
        );
    }

    render(): JSX.Element {
        const coinPrice = calculateAndFormatDeSoInUsd(this.props.profile?.CoinPriceDeSoNanos);
        return <View style={styles.container}>
            <ProfileInfoImageComponent
                customAction={this.props.customAction}
                peekDisabled={this.props.peekDisabled}
                navigation={this.props.navigation}
                profile={this.props.profile}
                imageSize={this.props.imageSize}
            />
            <View>
                <ProfileInfoUsernameComponent
                    customAction={this.props.customAction}
                    peekDisabled={this.props.peekDisabled}
                    navigation={this.props.navigation}
                    isDarkMode={this.props.ìsDarkMode}
                    profile={this.props.profile}
                />

                <View style={styles.bottomRow}>
                    {
                        !this.props.noCoinPrice &&
                        !this.state.isCoinPriceHidden &&
                        <CoinPriceComponent
                            isDarkMode={this.props.ìsDarkMode}
                            isProfileManager={this.props.isProfileManager}
                            price={coinPrice}
                        />
                    }
                    {
                        this.props.duration &&
                        <>
                            <Ionicons style={styles.durationIcon} name="ios-time-outline" size={14} color={themeStyles.fontColorSub.color} />
                            <Text style={[styles.durationText, themeStyles.fontColorSub]}>{this.props.duration}</Text>
                        </>
                    }
                </View>
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
            alignItems: 'center'
        },
        durationIcon: {
            marginLeft: 8,
            marginRight: 2,
            marginTop: 6
        },
        durationText: {
            fontSize: 12,
            marginTop: 6
        }
    }
);
