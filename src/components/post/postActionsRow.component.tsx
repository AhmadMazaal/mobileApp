import React from 'react';
import { View, StyleSheet, Text, Alert, TouchableOpacity, Platform } from 'react-native';
import { Ionicons, Fontisto, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { ParamListBase } from '@react-navigation/native';
import { EventType, Post } from '@types';
import { globals } from '@globals/globals';
import { diamondAnimation } from '@services/diamondAnimation';
import { api, calculateAndFormatDeSoInUsd } from '@services';
import { signing } from '@services/authorization/signing';
import { themeStyles } from '@styles/globalColors';
import { eventManager, hapticsManager } from '@globals/injector';
import { StackNavigationProp } from '@react-navigation/stack';

interface LikeIcon {
    name: 'ios-heart-sharp' | 'ios-heart-outline';
    color: string
}

interface Props {
    navigation: StackNavigationProp<ParamListBase>;
    post: Post;
    actionsDisabled?: boolean;
    toggleHeartIcon: () => void
}

interface State {
    likeIcon: LikeIcon;
    diamondLevel: number;
}

export class PostActionsRow extends React.Component<Props, State> {

    private _isMounted = false;

    constructor(props: Props) {
        super(props);

        this.state = {
            likeIcon: this.getLikeIcon(),
            diamondLevel: this.props.post.PostEntryReaderState.DiamondLevelBestowed
        };

        this.onLike = this.onLike.bind(this);
        this.onSendDiamonds = this.onSendDiamonds.bind(this);
        this.goToReply = this.goToReply.bind(this);
        this.goToReclout = this.goToReclout.bind(this);
        this.goToStats = this.goToStats.bind(this);
    }

    componentDidMount(): void {
        this._isMounted = true;
    }

    componentWillUnmount(): void {
        this._isMounted = false;
    }

    shouldComponentUpdate(p_nextProps: Props, p_nextState: State): boolean {
        return this.props.post.PostHashHex !== p_nextProps.post.PostHashHex ||
            this.state.likeIcon.name !== p_nextState.likeIcon.name ||
            this.state.diamondLevel !== p_nextState.diamondLevel;
    }

    private getLikeIcon = () => {
        const icon: LikeIcon = this.props.post.PostEntryReaderState?.LikedByReader ? { name: 'ios-heart-sharp', color: '#eb1b0c' } : { name: 'ios-heart-outline', color: '#a1a1a1' };
        return icon;
    }

    private async onLike() {
        const post = this.props.post;
        if (this.props.actionsDisabled) {
            return;
        }

        if (!post.PostEntryReaderState) {
            return;
        }

        const originalLikedByReader = post.PostEntryReaderState.LikedByReader;
        post.PostEntryReaderState.LikedByReader = !originalLikedByReader;
        if (post.PostEntryReaderState.LikedByReader) {
            post.LikeCount++;
            this.props.toggleHeartIcon();
        } else {
            post.LikeCount--;
        }

        if (this._isMounted) {
            this.setState({ likeIcon: this.getLikeIcon() });
        }

        try {
            if (!originalLikedByReader) {
                hapticsManager.lightImpact();
            }
            const response = await api.likePost(globals.user.publicKey, post.PostHashHex, originalLikedByReader);
            const transactionHex = response.TransactionHex;

            const signedTransactionHex = await signing.signTransaction(transactionHex);
            await api.submitTransaction(signedTransactionHex);

        } catch (e: any) {
            post.PostEntryReaderState.LikedByReader = originalLikedByReader;
            if (post.PostEntryReaderState.LikedByReader) {
                post.LikeCount++;
            } else {
                post.LikeCount--;
            }

            if (this._isMounted) {
                this.setState({ likeIcon: this.getLikeIcon() });
            }
        }
    }

    private onSendDiamonds() {
        const post = this.props.post;

        if (this.props.actionsDisabled || !post.PostEntryReaderState) {
            return;
        }

        if (globals.user.publicKey === post.ProfileEntryResponse?.PublicKeyBase58Check) {
            Alert.alert('Error', 'You cannot diamond your own posts.');
            return;
        }

        if (post.PostEntryReaderState.DiamondLevelBestowed === 0) {
            this.sendDiamonds(1).then(() => undefined).catch(() => undefined);
        } else {
            this.sendMultipleDiamonds();
        }
    }

    private sendMultipleDiamonds() {
        const post = this.props.post;

        const calculateDiamondsWorth = (count: number): string => {
            const nanos = 5000 * Math.pow(10, count);
            const usd = calculateAndFormatDeSoInUsd(nanos);
            return '💎 ' + String(count) + ' ($' + usd + ')';
        };

        const options: string[] = [];
        for (let i = post.PostEntryReaderState.DiamondLevelBestowed + 1; i < 7; i++) {
            const usd = calculateDiamondsWorth(i);
            options.push(usd);
        }

        options.push('Cancel');

        const callback = (p_optionIndex: number) => {
            const diamondLevel = post.PostEntryReaderState.DiamondLevelBestowed + 1 + p_optionIndex;
            if (diamondLevel < 4) {
                setTimeout(
                    () => {
                        this.sendDiamonds(diamondLevel).then(() => undefined).catch(() => undefined);
                    },
                    100
                );
            } else {
                const username = this.props.post.ProfileEntryResponse.Username;
                setTimeout(
                    () => {
                        Alert.alert(
                            'Send Diamonds',
                            `Are you sure you want to send ${options[p_optionIndex]} to @${username}?`,
                            [
                                {
                                    text: 'No',
                                },
                                {
                                    text: 'Yes',
                                    onPress: () => {
                                        this.sendDiamonds(diamondLevel).then(() => undefined).catch(() => undefined);
                                    }
                                }
                            ]
                        );
                    },
                    200
                );
            }
        };

        const headerDescription = options.length > 1 ?
            'Diamonds are a way to reward great content by sending an amount of $DESO as a tip' :
            'You have sent the maximum possible amount of diamonds to this post';
        eventManager.dispatchEvent(
            EventType.ToggleActionSheet,
            {
                visible: true,
                config: {
                    options,
                    callback,
                    headerDescription
                }
            }
        );
    }

    private async sendDiamonds(diamondLevel: number) {
        const post = this.props.post;

        diamondAnimation.show();

        const diamondDiff = diamondLevel - post.PostEntryReaderState.DiamondLevelBestowed;
        post.PostEntryReaderState.DiamondLevelBestowed = diamondLevel;
        post.DiamondCount += diamondDiff;

        this.setState({ diamondLevel: diamondLevel });

        try {
            hapticsManager.lightImpact();
            const response = await api.sendDiamonds(globals.user.publicKey, post.ProfileEntryResponse.PublicKeyBase58Check, post.PostHashHex, diamondLevel);
            const transactionHex = response.TransactionHex;

            const signedTransactionHex = await signing.signTransaction(transactionHex);
            await api.submitTransaction(signedTransactionHex);

        } catch {
            post.PostEntryReaderState.DiamondLevelBestowed -= diamondDiff;
            post.DiamondCount -= diamondDiff;

            if (this._isMounted) {
                this.setState({ diamondLevel: post.PostEntryReaderState.DiamondLevelBestowed });
            }
        }
    }

    private goToReply() {
        if (this.props.actionsDisabled) {
            return;
        }

        this.props.navigation.navigate(
            'CreatePost',
            {
                parentPost: this.props.post,
                comment: true
            }
        );
    }

    private goToReclout() {
        if (this.props.actionsDisabled) {
            return;
        }

        this.props.navigation.navigate(
            'CreatePost',
            {
                recloutedPost: this.props.post,
                reclout: true
            }
        );
    }

    private goToStats(p_selectedTab: string) {
        this.props.navigation.push(
            'PostStatsTabNavigator',
            {
                postHashHex: this.props.post.PostHashHex,
                selectedTab: p_selectedTab
            }
        );
        hapticsManager.customizedImpact();
    }

    render(): JSX.Element {
        return <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.5} onPress={() => this.onLike()} onLongPress={() => this.goToStats('Likes')}>
                <Ionicons name={this.state.likeIcon.name} size={24} color={this.state.likeIcon.color} />
                <Text style={styles.actionText}>{this.props.post.LikeCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} activeOpacity={0.5} onPress={() => this.goToReply()}>
                <Fontisto name='comment' size={19} color={'#a1a1a1'} />
                <Text style={styles.actionText}>{this.props.post.CommentCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} activeOpacity={0.5} onPress={() => this.goToReclout()} onLongPress={() => this.goToStats('Reclouts')}>
                <MaterialCommunityIcons name='twitter-retweet' size={28} color={this.props.post.PostEntryReaderState?.RepostedByReader ? '#5ba358' : '#a1a1a1'} />
                <Text style={styles.actionText}>{this.props.post.RepostCount + this.props.post.QuoteRepostCount}</Text>
            </TouchableOpacity>

            {
                Platform.OS !== 'ios' ?
                    <TouchableOpacity style={styles.actionButton} activeOpacity={0.5} onPress={() => this.onSendDiamonds()} onLongPress={() => this.sendMultipleDiamonds()}>
                        <FontAwesome name='diamond' size={18} color={this.state.diamondLevel != null && this.state.diamondLevel > 0 ? themeStyles.diamondColor.color : '#a1a1a1'} />
                        <Text style={styles.actionText}>{this.props.post.DiamondCount}</Text>
                    </TouchableOpacity> :
                    <View style={styles.actionButton} />
            }
        </View>;
    }
}

const styles = StyleSheet.create(
    {
        actionsContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 14,
            marginLeft: 10
        },
        actionButton: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            marginRight: 10,
        },
        actionText: {
            marginLeft: 4,
            color: '#a1a1a1',
            fontSize: 12
        },
    }
);
