import React, { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { Text, View, StyleSheet, InputAccessoryView, Platform, Dimensions, KeyboardAvoidingView, Alert } from 'react-native';
import { ScrollView, TouchableOpacity } from 'react-native-gesture-handler';
import * as Clipboard from 'expo-clipboard';
import { Fontisto, Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ImageGalleryComponent } from './imageGallery.component';
import { themeStyles } from '@styles';
import { settingsGlobals } from '../globals/settingsGlobals';
import { EventType, Post, Profile, ToggleRefreshDraftPostsEvent } from '@types';
import { PostComponent } from './post/post.component';
import { useNavigation, useRoute } from '@react-navigation/core';
import { ImageInfo } from 'expo-image-picker/build/ImagePicker.types';
import { MentionInput, MentionSuggestionsProps, replaceMentionValues } from 'react-native-controlled-mentions';
import { UserSuggestionList } from './userSuggestionList.component';
import { parseVideoLinkAsync } from '@services/videoLinkParser';
import { CloutTagSuggestionList } from './cloutTagSuggestionList.component';
import CloutFeedVideoComponent from './post/cloutFeedVideo.component';
import { eventManager } from '@globals/injector';
import { wait } from '@services/promiseHelper';
import CloutFeedButton from '@components/cloutfeedButton.component';
import ProfileInfoCardComponent from './profileInfo/profileInfoCard.component';
import { ParamListBase } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { constants } from '@globals/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { globals } from '@globals/globals';
import { generatePostHashHex } from '@services/helpers';
import { snackbar } from '@services/snackbar';

interface Props {
    profile: Profile,
    postText: string,
    setPostText: (postText: string) => void,
    editedPostImageUrls: string[],
    setImagesBase64: Dispatch<SetStateAction<string[]>>,
    recloutedPost?: Post,
    videoLink: string,
    setVideoLink: (link: string) => void;
    newPost: boolean;
    editPost?: boolean;
    editedPost?: Post;
    isDraftPost?: boolean;
    draftPosts?: Post[]
    setCurrentPostHashHex?: (postHashHex: string) => void
}

export function CreatePostComponent(
    { profile, postText, setPostText, editedPostImageUrls, setImagesBase64, recloutedPost, videoLink, setVideoLink, newPost, editPost, editedPost, isDraftPost, draftPosts, setCurrentPostHashHex }: Props) {
    const navigation = useNavigation<StackNavigationProp<ParamListBase>>();
    const route = useRoute();
    const postRef = useRef<Post>({} as Post);
    const imageUrlsRef = useRef<string[]>([]);
    const internalVideoLinkRef = useRef<string>(videoLink);
    const postTextRef = useRef<string>(postText);

    const oldDraftPostsRef = useRef<Post[]>([]);

    const mentionPartTypes = [
        {
            trigger: '@',
            renderSuggestions: UserSuggestionList,
            isBottomMentionSuggestionsRender: true,
            isInsertSpaceAfterMention: true,
            allowedSpacesCount: 0,
            textStyle: [styles.link, themeStyles.linkColor]
        },
        {
            trigger: '#',
            renderSuggestions: CloutTagSuggestionList as (props: MentionSuggestionsProps) => React.ReactNode,
            isBottomMentionSuggestionsRender: true,
            isInsertSpaceAfterMention: true,
            allowedSpacesCount: 0,
            textStyle: [styles.link, themeStyles.linkColor]
        },
        {
            trigger: '$',
            renderSuggestions: UserSuggestionList,
            isBottomMentionSuggestionsRender: true,
            isInsertSpaceAfterMention: true,
            allowedSpacesCount: 0,
            textStyle: [styles.link, themeStyles.linkColor]
        }
    ];
    const isMounted = useRef<boolean>(true);
    const [internalPostText, setInternalPostText] = useState(postText);
    const [imageUrls, setImageUrls] = useState<string[]>(editedPostImageUrls);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
    const [insertVideo, setInsertVideo] = useState<boolean>(!!videoLink);
    const [internalVideoLink, setInternalVideoLink] = useState<string>(videoLink);
    const [textSelection, setTextSelection] = useState<any>(newPost ? { start: 0, end: 0 } : undefined);
    const [areDraftsShown, setAreDraftsShown] = useState(false);

    const scrollViewRef = useRef<ScrollView>(null);
    let inputRef: any;

    const inputAccessoryViewId = Platform.OS === 'ios' ? 'inputAccessoryViewID' : undefined;

    useEffect(
        () => {
            if (!editPost) {
                initDrafts();
            }

            if (newPost) {
                const initialText = globals.isSignatureEnabled ? '\n\nPosted via @[cloutfeed](undefined)' : '';
                onMentionChange(initialText);
            }
            const unsubscribeRefreshDraftPosts = navigation.addListener('focus', () => { refreshDraftPosts(); });
            return () => {
                unsubscribeRefreshDraftPosts();
                isMounted.current = false;
            };
        },
        []
    );

    async function discardDraftPost(action: any) {
        try {
            const key = `${globals.user.publicKey}_${constants.localStorage_draftPost}`;
            if (oldDraftPostsRef.current.length === 0) {
                await AsyncStorage.removeItem(key);
            } else {
                await AsyncStorage.setItem(key, JSON.stringify([...oldDraftPostsRef.current]));
            }
            navigation.dispatch(action);
        } catch { }
    }

    useEffect(
        () => {
            if (editPost) {
                updateNavigation();
            }
            if ((route.params as any)?.newPost || (editPost && isDraftPost)) {
                const unsubscribeSwipeBackEvent = navigation.addListener(
                    'beforeRemove',
                    (e) => {
                        if (shouldSaveDraft() && !editPost) {
                            e.preventDefault();
                            const action = e.data.action;
                            Alert.alert(
                                'Discard Changes?',
                                'If you go back, you will lose the conent of this post',
                                [
                                    {
                                        text: 'Cancel',
                                        onPress: () => undefined,
                                        style: 'cancel'
                                    },
                                    {
                                        text: 'Discard',
                                        onPress: () => discardDraftPost(action),
                                        style: 'destructive'
                                    },
                                    {
                                        text: 'Save Draft',
                                        onPress: saveDraftPost
                                    }
                                ]
                            );
                        } else {
                            updateDraftPost();
                        }
                    }
                );
                return () => {
                    unsubscribeSwipeBackEvent();
                };
            }
        },
        [
            postText,
            imageUrls,
            videoLink,
            internalPostText,
            internalVideoLink,
        ]
    );

    useEffect(
        () => {
            const shouldSaveSingleDraftPost = isDraftPost || (route.params as any)?.newPost;
            if (shouldSaveDraft() && shouldSaveSingleDraftPost) {
                onSingleDraftPostChange();
            }
            if (setCurrentPostHashHex) {
                setCurrentPostHashHex(postRef.current?.PostHashHex);
            }
        },
        [
            postText,
            imageUrls,
            videoLink,
            internalPostText,
            internalVideoLink,
        ]
    );

    async function refreshDraftPosts() {
        const key = `${globals.user.publicKey}_${constants.localStorage_draftPost}`;
        const response = await AsyncStorage.getItem(key);
        if (response) {
            oldDraftPostsRef.current = JSON.parse(response);
            setAreDraftsShown(true);
        } else {
            setAreDraftsShown(false);
            oldDraftPostsRef.current = [];
        }
    }

    async function onSingleDraftPostChange(): Promise<void> {
        try {
            const key = `${globals.user.publicKey}_${constants.localStorage_draftPost}`;
            await AsyncStorage.setItem(key, JSON.stringify([postRef.current, ...oldDraftPostsRef.current]));
        } catch { }
    }

    function shouldSaveDraft(): boolean {
        const initialText = '\n\nPosted via @cloutfeed';
        return (initialText !== postText && postText.trim().length > 0) ||
            imageUrls?.length > 0 ||
            internalVideoLink?.length > 0;
    }

    function clearPost(): void {
        setImageUrls([]);
        imageUrlsRef.current = [];
        onMentionChange('', true);
        setSelectedImageIndex(0);
        setInsertVideo(false);
        setInternalVideoLink('');
        setTextSelection(newPost ? { start: 0, end: 0 } : undefined);
    }

    function saveDraftPost(): void {
        onSingleDraftPostChange();
        snackbar.showSnackBar({ text: 'Post saved as a draft' });
        clearPost();
        setTimeout(() => navigation.pop(), 500);
    }

    async function updateDraftPost(): Promise<void> {
        try {
            const key = `${globals.user.publicKey}_${constants.localStorage_draftPost}`;
            if (draftPosts && editedPost) {
                for (let i = 0; i < draftPosts.length; i++) {
                    if (draftPosts[i].PostHashHex === editedPost.PostHashHex) {
                        draftPosts[i].Body = postText;
                        draftPosts[i].PostExtraData.EmbedVideoURL = internalVideoLinkRef.current;
                        draftPosts[i].ImageURLs = imageUrls;
                    }
                }
                await AsyncStorage.setItem(key, JSON.stringify(draftPosts));
                const event: ToggleRefreshDraftPostsEvent = { draftPosts: [...draftPosts] };
                eventManager.dispatchEvent(EventType.ToggleRefreshDraftPosts, event);
            }
        } catch { }
    }

    function handleDiscardAlert(): void {
        return Alert.alert(
            'Discard Changes?',
            'If you go back, you will lose the conent of this post',
            [
                {
                    text: 'Cancel',
                    onPress: () => undefined,
                    style: 'cancel'
                },
                {
                    text: 'Discard',
                    onPress: () => navigation.goBack(),
                    style: 'destructive'
                },
                {
                    text: 'Save Draft',
                    onPress: saveDraftPost
                }
            ]
        );
    }

    function updateNavigation(): void {
        let callback = () => navigation.pop();
        if (shouldSaveDraft() && !editPost) {
            callback = handleDiscardAlert;
        }
        if (isDraftPost && editedPost) {
            callback = () => { updateDraftPost(); navigation.goBack(); };
        }

        navigation.setOptions(
            {
                headerLeft: () => <TouchableOpacity onPress={callback} activeOpacity={1}>
                    <Ionicons name="chevron-back" size={32} color="#007ef5" />
                </TouchableOpacity>
                ,
                headerTitleStyle: {
                    color: themeStyles.fontColorMain.color,
                    alignSelf: 'center'
                }
            }
        );
    }

    async function initDrafts(): Promise<void> {
        try {
            const key = `${globals.user.publicKey}_${constants.localStorage_draftPost}`;
            const oldDrafts = await AsyncStorage.getItem(key);
            if (oldDrafts) {
                const parsetOldDrafts = JSON.parse(oldDrafts);
                if (parsetOldDrafts.length > 0) {
                    setAreDraftsShown(true);
                }
                if (parsetOldDrafts.length !== 0) {
                    oldDraftPostsRef.current = parsetOldDrafts;
                }
            } else {
                setAreDraftsShown(false);
            }
        } catch { }
    }

    function goToDraftPosts(): void {
        navigation.navigate('DraftPosts', { draftPosts: oldDraftPostsRef.current });
    }

    function pickImage(): void {

        if (imageUrls?.length === 5) {
            alert('You have reached the maximum number of images you can attach per post.');
            return;
        }
        let result: ImagePicker.ImagePickerResult;

        const options = ['Camera', 'Gallery', 'Cancel'];
        const callback = async (optionIndex: number) => {
            switch (optionIndex) {
                case 0:
                    if (Platform.OS !== 'web') {
                        const { status } = await ImagePicker.requestCameraPermissionsAsync();
                        if (status !== 'granted') {
                            alert('In order to be able to capture one of your images and attach it to your comment, we need access to your camera.');
                            return;
                        }
                    }

                    await wait(250);
                    result = await ImagePicker.launchCameraAsync(
                        {
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            quality: undefined
                        }
                    );
                    break;
                case 1:
                    if (Platform.OS !== 'web') {
                        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (status !== 'granted') {
                            alert('In order to be able to choose one of your images and attach it to your comment, we need access to your photos.');
                            return;
                        }
                    }

                    await wait(250);
                    result = await ImagePicker.launchImageLibraryAsync(
                        {
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            quality: undefined
                        }
                    );
                    break;
            }
            if (!result.cancelled) {
                if (result.type === 'image') {
                    if (isMounted.current) {
                        const uri = (result as ImageInfo).uri;
                        const newImages = [...imageUrls, uri];
                        setImageUrls(previous => [...previous, uri]);
                        imageUrlsRef.current = newImages;
                        setImagesBase64((previous: string[]) => [...previous, uri]);
                        setSelectedImageIndex(imageUrls.length);
                    }
                } else {
                    alert('We just support images at the moment.');
                }
            }
        };

        eventManager.dispatchEvent(
            EventType.ToggleActionSheet,
            {
                visible: true,
                config: { options, callback, destructiveButtonIndex: [] }
            }
        );
    }

    function onRemoveImage(index: number): void {
        setImageUrls(
            (previous: string[]) => {
                const copy: string[] = previous.slice(0);
                copy.splice(index, 1);
                return copy;
            }
        );
        setImagesBase64(
            (previous: string[]) => {
                const copy = previous.slice(0);
                copy.splice(index, 1);
                return copy;
            }
        );
    }

    async function onPasteVideoLink(): Promise<void> {
        try {
            const copiedVideolink = await Clipboard.getStringAsync();
            if (!copiedVideolink) {
                Alert.alert('Clipboard is empty!', 'Please make sure you copied the link correctly.');
                return;
            }
            const parseVideoLink = await parseVideoLinkAsync(copiedVideolink);
            if (parseVideoLink) {
                if (isMounted.current) {
                    internalVideoLinkRef.current = parseVideoLink.videoLink;
                    setInternalVideoLink(parseVideoLink.videoLink);
                    setVideoLink(parseVideoLink.videoLink);
                }
            } else {
                Alert.alert('Error', 'The video link is not valid. We just support YouTube, TikTok, Vimeo, Spotify, SoundCloud and GIPHY links.');
            }
        } catch { }
    }

    postRef.current = {
        Body: postTextRef.current,
        OwnerPublicKeyBase58Check: profile.PublicKeyBase58Check,
        CommentCount: 0,
        Comments: [],
        ConfirmationBlockHeight: 0,
        CreatorBasisPoints: 0,
        DiamondCount: 0,
        ImageURLs: imageUrlsRef.current,
        InGlobalFeed: true,
        InMempool: false,
        IsHidden: false,
        IsNFT: false,
        IsPinned: false,
        LikeCount: 1,
        NFTRoyaltyToCoinBasisPoints: 0,
        NFTRoyaltyToCreatorBasisPoints: 0,
        NumNFTCopies: 0,
        NumNFTCopiesForSale: 0,
        ParentPosts: {} as Post,
        ParentStakeID: '',
        PostEntryReaderState: {
            DiamondLevelBestowed: 0,
            LikedByReader: false,
            RepostPostHashHex: '',
            RepostedByReader: false,
        },
        PostExtraData: {
            EmbedVideoURL: internalVideoLinkRef.current
        },
        PostHashHex: editPost ? editedPost?.PostHashHex as string : generatePostHashHex(),
        PosterPublicKeyBase58Check: profile?.PublicKeyBase58Check,
        ProfileEntryResponse: profile,
        QuoteRepostCount: 0,
        RepostCount: 0,
        RepostedPostEntryResponse: null as any,
        StakeMultipleBasisPoints: 12500,
        TimestampNanos: Math.round((new Date()).getTime() * 1000000),
        VideoURLs: [],
        SerialNumber: 0,
        HighestBidAmountNanos: 0,
        LastAcceptedBidAmountNanos: 0,
        LowestBidAmountNanos: 0,
        MinBidAmountNanos: 0,
        BidAmountNanos: 0
    };

    function onMentionChange(value: string, clear = false): void {
        const replaceMention = replaceMentionValues(value, ({ name, trigger }) => `${trigger}${name}`);
        setPostText(replaceMention);
        if (!clear) {
            postTextRef.current = replaceMention;
        }
        setInternalPostText(value);
        inputRef?.focus();
    }

    function onRemoveVideoLink(): void {
        setInternalVideoLink('');
        internalVideoLinkRef.current = '';
        setVideoLink('');
        setInsertVideo(false);
    }

    return <ScrollView
        ref={scrollViewRef}
        bounces={false}
        keyboardShouldPersistTaps={'always'}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerContainer}>
            <ProfileInfoCardComponent
                profile={profile}
                noCoinPrice={true}
                navigation={navigation}
                imageSize={30}
                peekDisabled={true}
            />
        </View>

        <MentionInput
            inputRef={ref => inputRef = ref}
            style={[styles.textInput, themeStyles.fontColorMain]}
            placeholder="Share your ideas with the world..."
            placeholderTextColor={themeStyles.fontColorSub.color}
            multiline
            value={internalPostText}
            autoFocus
            inputAccessoryViewID={inputAccessoryViewId}
            onChange={(value) => onMentionChange(value)}
            keyboardAppearance={settingsGlobals.darkMode ? 'dark' : 'light'}
            selection={textSelection}
            onSelectionChange={() => {
                setTextSelection(undefined);
            }}
            partTypes={mentionPartTypes}
        />
        {
            imageUrls?.length > 0 &&
            <ImageGalleryComponent
                goToStats={() => undefined}
                imageUrls={imageUrls}
                removable={true}
                onRemove={onRemoveImage}
                selectedImageIndex={selectedImageIndex} />
        }

        {
            insertVideo && !internalVideoLink ?
                <View style={styles.insertVideoContainer}>
                    <TouchableOpacity style={styles.videoIconTextContainer} onPress={onPasteVideoLink} >
                        <Ionicons name="md-videocam-outline" size={60} color={themeStyles.fontColorMain.color} />
                        <Text style={[styles.insertVideoText, themeStyles.fontColorMain]}>Click here to paste your video URL</Text>
                        <Text style={[styles.insertVideoText, themeStyles.fontColorMain]}>YouTube, TikTok, Vimeo, Spotify, SoundCloud and GIPHY links are supported</Text>
                    </TouchableOpacity>
                    <CloutFeedButton
                        styles={styles.cancelBtn}
                        title={'Cancel'}
                        onPress={() => setInsertVideo(false)}
                    />
                </View>
                : undefined
        }

        {
            insertVideo && internalVideoLink ?
                <View>
                    <View style={styles.removeButtonContainer}>
                        <TouchableOpacity style={styles.removeButton} onPress={onRemoveVideoLink}>
                            <Fontisto name="close-a" size={14} color="white" />
                        </TouchableOpacity>
                    </View>
                    <CloutFeedVideoComponent embeddedVideoLink={internalVideoLink} />
                </View>
                :
                undefined
        }

        {
            recloutedPost ?
                <View style={[styles.recloutedPostContainer, themeStyles.recloutBorderColor]}>
                    <PostComponent
                        route={route}
                        navigation={navigation}
                        post={recloutedPost}
                        disablePostNavigate={true}
                        disableProfileNavigation={true}
                        actionsDisabled={true}
                        hideBottomBorder={true}></PostComponent>
                </View>
                :
                undefined
        }
        {
            Platform.OS === 'ios' ?
                <InputAccessoryView nativeID={inputAccessoryViewId}>
                    <View style={[{ justifyContent: 'space-between' }, styles.inputAccessory, themeStyles.containerColorMain, themeStyles.recloutBorderColor]}>
                        <View style={styles.inputAccessoryButton}>
                            <TouchableOpacity style={styles.inputAccessoryButton} activeOpacity={0.8} onPress={pickImage}>
                                <Feather name="image" size={20} color={themeStyles.fontColorMain.color} />
                                <Text style={[styles.inputAccessoryButtonText, themeStyles.fontColorMain]}>Image</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.inputAccessoryButton} activeOpacity={0.8} onPress={() => { setInsertVideo(true); scrollViewRef.current?.scrollToEnd({ animated: true }); }}>
                                <Ionicons name="md-videocam-outline" size={24} color={themeStyles.fontColorMain.color} />
                                <Text style={[styles.inputAccessoryButtonText, themeStyles.fontColorMain]}>Video</Text>
                            </TouchableOpacity>
                        </View>
                        {
                            areDraftsShown &&
                            <TouchableOpacity activeOpacity={0.8} onPress={goToDraftPosts} style={styles.inputAccessoryButton} >
                                <MaterialCommunityIcons name="file-document-edit-outline" size={24} color={themeStyles.fontColorMain.color} />
                                <Text style={[styles.inputAccessoryButtonText, themeStyles.fontColorMain]}>Drafts</Text>
                            </TouchableOpacity>
                        }
                    </View>
                </InputAccessoryView>
                :
                <KeyboardAvoidingView
                    behavior={'height'}
                    keyboardVerticalOffset={65}>
                    <View style={[styles.inputAccessory, themeStyles.containerColorMain, themeStyles.recloutBorderColor]}>
                        <View style={styles.row}>
                            <TouchableOpacity style={styles.inputAccessoryButton} onPress={pickImage}>
                                <Feather name="image" size={20} color={themeStyles.fontColorMain.color} />
                                <Text style={[styles.inputAccessoryButtonText, themeStyles.fontColorMain]}>Image</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.inputAccessoryButton} onPress={() => setInsertVideo(true)}>
                                <Ionicons name="md-videocam-outline" size={24} color={themeStyles.fontColorMain.color} />
                                <Text style={[styles.inputAccessoryButtonText, themeStyles.fontColorMain]}>Video</Text>
                            </TouchableOpacity>
                        </View>
                        {
                            areDraftsShown &&
                            <TouchableOpacity activeOpacity={0.8} onPress={goToDraftPosts} style={styles.inputAccessoryButton} >
                                <MaterialCommunityIcons name="file-document-edit-outline" size={24} color={themeStyles.fontColorMain.color} />
                                <Text style={[styles.inputAccessoryButtonText, themeStyles.fontColorMain]}>Drafts</Text>
                            </TouchableOpacity>
                        }
                    </View>
                </KeyboardAvoidingView>
        }
        {newPost && <Text style={[styles.hintText, themeStyles.fontColorSub]}>Include @CloutFeed signature and receive 1-4 Diamonds on every new post. (Max. 5 posts daily)</Text>}
        <View style={styles.emptyView} />
    </ScrollView>;
}

const styles = StyleSheet.create(
    {
        headerContainer: {
            paddingTop: 10,
            paddingLeft: 10,
        },
        textInput: {
            marginHorizontal: 10,
            fontSize: 16,
            width: Dimensions.get('window').width - 20,
            minHeight: 40,
            marginTop: 10,
            maxHeight: 150
        },
        inputAccessory: {
            paddingLeft: 16,
            paddingVertical: 8,
            borderTopWidth: 1,
            flexDirection: 'row',
            alignItems: 'center'
        },
        inputAccessoryButton: {
            flexDirection: 'row',
            alignItems: 'center',
            marginRight: 16
        },
        row: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        inputAccessoryButtonText: {
            marginLeft: 6
        },
        insertVideoContainer: {
            height: 200,
            width: '75%',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 'auto',
            marginRight: 'auto'
        },
        videoIconTextContainer: {
            alignItems: 'center'
        },
        insertVideoText: {
            textAlign: 'center'
        },
        cancelBtn: {
            marginTop: 10
        },
        recloutedPostContainer: {
            marginHorizontal: 10,
            borderWidth: 1,
            padding: 10,
            paddingBottom: 4,
            borderRadius: 8,
            marginTop: 10
        },
        removeButtonContainer: {
            backgroundColor: '#c42326',
            width: 30,
            height: 30,
            zIndex: 10,
            position: 'absolute',
            top: 10,
            right: 10,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            opacity: 0.8
        },
        removeButton: {
            width: 30,
            height: 30,
            alignItems: 'center',
            justifyContent: 'center',
        },
        link: {
            fontWeight: '500'
        },
        emptyView: {
            height: 500
        },
        hintText: {
            marginHorizontal: 10,
            marginTop: 5,
            fontSize: 10
        }
    }
);
