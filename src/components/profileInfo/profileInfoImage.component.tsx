import React from 'react';
import { StyleSheet, Image, TouchableOpacity } from 'react-native';
import { api, calculateDeSoInUSD } from '@services';
import { EventType, Profile } from '@types';
import { eventManager, hapticsManager } from '@globals/injector';
import { StackNavigationProp } from '@react-navigation/stack';
import { ParamListBase } from '@react-navigation/native';

interface Props {
    imageSize?: number;
    profile: Profile;
    navigation: StackNavigationProp<ParamListBase>;
    peekDisabled?: boolean;
    historyEnabled?: boolean;
    customAction?: () => void;
}

interface State {
    imageUri: string;
}

export default class ProfileInfoImageComponent extends React.Component<Props, State> {

    private _isMounted = false;

    constructor(props: Props) {
        super(props);

        const imageUri = api.getSingleProfileImage(this.props.profile?.PublicKeyBase58Check) + '?' + new Date().toISOString();
        this.state = {
            imageUri: imageUri
        };

        this.toggleProfileCardModal = this.toggleProfileCardModal.bind(this);
        this.goToProfile = this.goToProfile.bind(this);
        this.init(imageUri);
    }

    componentDidMount(): void {
        this._isMounted = true;
    }

    componentWillUnmount(): void {
        this._isMounted = false;
    }

    shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
        return this.props.profile !== nextProps.profile ||
            this.state.imageUri !== nextState.imageUri;
    }

    private async init(imageUri: string) {
        try {
            await Image.prefetch(imageUri);
        } catch {
            if (this._isMounted) {
                this.setState({ imageUri: 'https://i.imgur.com/vZ2mB1W.png' });
            }
        }
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
            activeOpacity={1}>
            <Image
                style={
                    [
                        styles.image,
                        !!this.props.imageSize && {
                            width: this.props.imageSize,
                            height: this.props.imageSize
                        }
                    ]
                }
                source={{ uri: this.state.imageUri }}
            />
        </TouchableOpacity>;
    }
}

const styles = StyleSheet.create(
    {
        image: {
            width: 40,
            height: 40,
            borderRadius: 6,
            marginRight: 12
        },
    }
);
