import { NavigationProp } from '@react-navigation/core';
import { ActionSheetConfig } from '@services/actionSheet';
import { ContactWithMessages, HiddenNFTType } from '.';
import { BidEdition, Post, Profile } from './models';

export interface ChangeFollowersEvent {
    publicKey: string;
}

export interface ToggleActionSheetEvent {
    visible: boolean;
    config: ActionSheetConfig;
}

export interface ToggleProfileManagerEvent {
    visible: boolean;
    navigation: NavigationProp<any>;
}

export interface ToggleCloutCastFeedEvent {
    active: boolean;
}

export interface ToggleHideNFTsEvent {
    hidden: boolean;
    type: HiddenNFTType
}

export interface FocusSearchHeaderEvent {
    focused: boolean;
}

export interface NavigationEvent {
    loggedInUsername: string;
    screen: 'Post' | 'UserProfile';
    publicKey?: string;
    username?: string;
    postHashHex?: string;
    priorityCommentHashHex?: string;
}

export interface UnsavePostEvent {
    post: Post;
}

export interface RemovePendingBadges {
    badgesToRemove: string[];
}

export interface ToggleBidFormEvent {
    visible: boolean;
    post: Post;
    bidEdition: BidEdition
}

export interface ToggleProfileInfoModalEvent {
    visible: boolean;
    profile: Profile;
    coinPrice: number;
    navigation: NavigationProp<any>;
}

export interface ToggleSellNftModalEvent {
    selectedNftsForSale: Post[]
}

export interface ToggleRefreshDraftPostsEvent {
    draftPosts: Post[];
}

export interface ToggleHideCoinPriceEvent {
    hidden: boolean;
}

export interface UpdateArchivesEvent {
    unarchivedContact: ContactWithMessages;
}
