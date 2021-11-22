import React from 'react';
import { Alert, Linking, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { EventType, Post, UnsavePostEvent } from '@types';
import { globals } from '@globals/globals';
import { signing } from '@services/authorization/signing';
import { api, cache } from '@services';
import { eventManager } from '@globals/injector';
import * as Clipboard from 'expo-clipboard';
import { snackbar } from '@services/snackbar';
import { ParamListBase, RouteProp } from '@react-navigation/native';
import { cloutApi } from '@services/api/cloutApi';
import { StackNavigationProp } from '@react-navigation/stack';

interface Props {
    navigation: StackNavigationProp<ParamListBase>;
    route: RouteProp<ParamListBase, string>;
    post: Post;
}

export class PostOptionsComponent extends React.Component<Props> {

    constructor(props: Props) {
        super(props);

        this.onPostOptionsClick = this.onPostOptionsClick.bind(this);
    }

    shouldComponentUpdate(p_nextProps: Props): boolean {
        return p_nextProps.post?.PostHashHex !== this.props.post?.PostHashHex;
    }

    private onPostOptionsClick() {
        if (globals.user.publicKey !== this.props.post.ProfileEntryResponse.PublicKeyBase58Check) {
            this.showNotOwnPostOptions();
        } else {
            this.showOwnPostOptions();
        }
    }

    private showNotOwnPostOptions() {
        const isPostSaved = !!cache.savedPosts.savedPosts[this.props.post.PostHashHex];
        const savePostText = isPostSaved ? 'Unsave Post' : 'Save Post';

        const options = [savePostText, 'Open in Browser', 'Copy Link', 'Copy Text', 'Report', 'Block User', 'Cancel'];

        const callback = async (p_optionIndex: number) => {
            switch (p_optionIndex) {
                case 0:
                    if (isPostSaved) {
                        await this.unsavePost();
                    } else {
                        await this.savePost();
                    }
                    break;
                case 1:
                    Linking.openURL(`https://bitclout.com/posts/${this.props.post.PostHashHex}`);
                    break;
                case 2:
                    this.copyToClipBoard(true);
                    break;
                case 3:
                    this.copyToClipBoard(false);
                    break;
                case 4:
                    Linking.openURL(`https://report.bitclout.com/?ReporterPublicKey=${globals.user.publicKey}&PostHash=${this.props.post.PostHashHex}`);
                    break;
                case 5: {
                    const jwt = await signing.signJWT();

                    api.blockUser(globals.user.publicKey, this.props.post.ProfileEntryResponse.PublicKeyBase58Check, jwt, false).then(
                        () => {
                            this.props.navigation.navigate(
                                'Home',
                                {
                                    blockedUser: this.props.post.ProfileEntryResponse.PublicKeyBase58Check
                                }
                            );
                            cache.user.getData(true);
                            snackbar.showSnackBar(
                                {
                                    text: 'User has been blocked'
                                }
                            );
                        }
                    ).catch(() => Alert.alert('Error', 'Something went wrong! Please try again.'));
                    break;
                }
            }
        };

        eventManager.dispatchEvent(
            EventType.ToggleActionSheet,
            {
                visible: true,
                config: { options, callback, destructiveButtonIndex: [4, 5] }
            }
        );
    }

    private async handleDeletePost(): Promise<void> {
        try {
            const response = await api.hidePost(
                globals.user.publicKey,
                this.props.post.PostHashHex,
                this.props.post.Body,
                this.props.post.ImageURLs,
                this.props.post.RepostedPostEntryResponse?.PostHashHex
            );

            const transactionHex = response.TransactionHex;
            const signedTransactionHex = await signing.signTransaction(transactionHex);
            await api.submitTransaction(signedTransactionHex);

            if (this.props.route.name === 'Home' || this.props.route.name === 'Profile') {
                snackbar.showSnackBar({ text: 'Your post was deleted successfully.' });
                this.props.navigation.navigate(
                    this.props.route.name,
                    {
                        deletedPost: this.props.post.PostHashHex
                    }
                );

            } else {
                snackbar.showSnackBar({ text: 'Your post was deleted successfully. Please reload the screen to see this change.' });
            }

        } catch (error) {
            globals.defaultHandleError(error);
        }
    }

    private async showOwnPostOptions() {
        const isPostSaved = !!cache.savedPosts.savedPosts[this.props.post.PostHashHex];
        const savePostText = isPostSaved ? 'Unsave Post' : 'Save Post';

        const pinnedPost = await cache.pinnedPost.getData();
        const isPostPinned = pinnedPost?.postHashHex === this.props.post.PostHashHex;
        const pinPostText = isPostPinned ? 'Unpin from Profile' : 'Pin to Profile';
        const isNft = this.props.post.IsNFT;
        const options = isNft ?
            [pinPostText, savePostText, 'Open in Browser', 'Copy Link', 'Copy Text', 'Cancel'] :
            ['Mint NFT', pinPostText, savePostText, 'Open in Browser', 'Copy Link', 'Copy Text', 'Edit', 'Delete Post', 'Cancel'];

        const callback = isNft ?
            async (p_optionIndex: number) => {
                switch (p_optionIndex) {
                    case 0:
                        if (isPostPinned) {
                            this.unpinPost();
                        } else {
                            this.pinPost();
                        }
                        break;
                    case 1:
                        if (isPostSaved) {
                            await this.unsavePost();
                        } else {
                            await this.savePost();
                        }
                        break;
                    case 2:
                        Linking.openURL(`https://bitclout.com/posts/${this.props.post.PostHashHex}`);
                        break;
                    case 3:
                        return this.copyToClipBoard(true);
                    case 4:
                        return this.copyToClipBoard(false);
                }
            } :
            async (p_optionIndex: number) => {
                switch (p_optionIndex) {
                    case 0:
                        this.props.navigation.push(
                            'MintPost',
                            {
                                postHashHex: this.props.post.PostHashHex,
                            }
                        );
                        break;
                    case 1:
                        if (isPostPinned) {
                            this.unpinPost();
                        } else {
                            this.pinPost();
                        }
                        break;
                    case 2:
                        if (isPostSaved) {
                            await this.unsavePost();
                        } else {
                            await this.savePost();
                        }
                        break;
                    case 3:
                        Linking.openURL(`https://bitclout.com/posts/${this.props.post.PostHashHex}`);
                        break;
                    case 4:
                        return this.copyToClipBoard(true);
                    case 5:
                        return this.copyToClipBoard(false);
                    case 6:
                        if (this.props.post.Body || this.props.post.ImageURLs?.length > 0) {
                            this.props.navigation.navigate(
                                'CreatePost',
                                {
                                    editPost: true,
                                    editedPost: this.props.post
                                }
                            );
                        } else {
                            Alert.alert('Sorry!', 'You cannot edit a reclout, if it does not include a quote.');
                        }
                        break;
                    case 7:
                        setTimeout(
                            () => {
                                Alert.alert(
                                    'Hide Post?',
                                    'Are you sure you want to hide this post? This action cannot be undone',
                                    [
                                        {
                                            text: 'Cancel',
                                            onPress: () => undefined,
                                            style: 'cancel'
                                        },
                                        {
                                            text: 'Confirm',
                                            onPress: () => this.handleDeletePost(),
                                            style: 'destructive'
                                        }
                                    ]

                                );
                            },
                            250
                        );
                        break;
                }
            };

        eventManager.dispatchEvent(
            EventType.ToggleActionSheet,
            {
                visible: true,
                config: {
                    options,
                    callback,
                    destructiveButtonIndex: isNft ? [] : [7],
                    mintingButton: isNft ? undefined : 0
                }
            }
        );
    }

    private copyToClipBoard(p_isLink: boolean) {
        const text = p_isLink ? 'Link copied to clipboard' : 'Text copied to clipboard';
        const postLink = p_isLink ? `https://bitclout.com/posts/${this.props.post.PostHashHex}` : this.props.post.Body;
        Clipboard.setString(postLink);
        snackbar.showSnackBar({ text });
    }

    private async savePost() {
        const jwt = await signing.signJWT();
        let message = '';

        try {
            await cloutApi.savePost(globals.user.publicKey, jwt, this.props.post.PostHashHex);
            cache.savedPosts.savedPosts[this.props.post.PostHashHex] = true;
            message = 'Post has been saved';
        } catch {
            message = 'Something went wrong';
        }

        snackbar.showSnackBar({ text: message });
    }

    private async unsavePost() {
        const jwt = await signing.signJWT();
        let message = '';

        try {
            await cloutApi.unsavePost(globals.user.publicKey, jwt, this.props.post.PostHashHex);
            cache.savedPosts.savedPosts[this.props.post.PostHashHex] = false;
            message = 'Post has been unsaved';
            const event: UnsavePostEvent = { post: this.props.post };
            eventManager.dispatchEvent(EventType.UnsavePost, event);
        } catch {
            message = 'Something went wrong';
        }

        snackbar.showSnackBar({ text: message });
    }

    private async unpinPost() {
        const jwt = await signing.signJWT();
        let message = '';

        try {
            await cloutApi.unpinPost(globals.user.publicKey, jwt, this.props.post.PostHashHex);
            cache.pinnedPost.getData(true);
            message = 'Post has been unpinned';
        } catch {
            message = 'Something went wrong';
        }

        snackbar.showSnackBar({ text: message });
    }

    private async pinPost() {
        const jwt = await signing.signJWT();
        let message = '';

        try {
            await cloutApi.pinPost(globals.user.publicKey, jwt, this.props.post.PostHashHex);
            cache.pinnedPost.getData(true);
            message = 'Post has been pinned';
        } catch {
            message = 'Something went wrong';
        }

        snackbar.showSnackBar({ text: message });
    }

    render(): JSX.Element {
        return <TouchableOpacity activeOpacity={1} onPress={() => this.onPostOptionsClick()}>
            <Feather name='more-horizontal' size={20} color='#a1a1a1' />
        </TouchableOpacity>;
    }
}
