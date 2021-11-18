export enum EventType {
    IncreaseFollowers = 0,
    DecreaseFollowers = 1,
    OpenMessagesSettings = 2,
    ToggleProfileManager = 3,
    Navigation = 4,
    ToggleNotificationsFilter = 5,
    ToggleActionSheet = 6,
    UnsavePost = 7,
    ToggleCloutCastFeed = 8,
    RemovePendingBadges = 9,
    ToggleProfileInfoModal = 10,
    RefreshNotifications = 11,
    RefreshMessages = 12,
    FocusSearchHeader = 13,
    ToggleBidForm = 14,
    ToggleSetSelectedNfts = 15,
    BroadcastMessage = 16,
    ToggleHideNFTs = 17,
    ToggleRefreshDraftPosts = 18,
    ToggleHideCoinPrice = 19,
    UpdateArchivedChats = 22
}

export enum DiscoveryType {
    ValueCreator = 'ValueCreator',
    Goddess = 'Goddess',
    CommunityProject = 'CommunityProject',
    FeaturedCreator = 'FeaturedCreator',
    Developer = 'Developer',
    FeaturedNFT = 'FeaturedNFT'
}

export enum NotificationType {
    SubmitPost = 'SUBMIT_POST',
    BasicTransfer = 'BASIC_TRANSFER',
    CreatorCoin = 'CREATOR_COIN',
    Follow = 'FOLLOW',
    Like = 'LIKE',
    CreatorCoinTransfer = 'CREATOR_COIN_TRANSFER',
    NftBid = 'NFT_BID',
    AcceptNftBid = 'ACCEPT_NFT_BID'
}

export enum OptionType {
    Post = 'Post',
    FounderReward = 'FounderReward',
    Follow = 'Follow',
    None = ''
}

export enum CloutFeedTheme {
    Automatic = 'automatic',
    Light = 'light',
    Dark = 'dark'
}

export enum HiddenNFTType {
    Posts = 'Post',
    Details = 'Details',
    None = 'None'
}

export enum FeedType {
    Hot = 'Hot',
    Global = 'Global',
    Following = 'Following',
    Recent = 'Recent',
}

export enum SubscriptionNotificationType {
    Post = 'Post',
    FounderReward = 'FounderReward'
}

export enum CloutCastFeedFilter {
    None = 'None',
    ForMe = 'ForMe'
}

export enum CloutCastFeedSort {
    None = 'None',
    HighestPayout = 'HighestPayout',
    LowestPayout = 'LowestPayout'
}

export enum HotFeedFilter {
    Today = 'day',
    Week = 'week'
}

export enum HomeScreenTab {
    Hot = 'Hot',
    Global = 'Global',
    Following = 'Following',
    Recent = 'Recent',
    Cast = 'Cast'
}

export enum MessageFilter {
    Holders = 'Holders',
    Holding = 'Holding',
    Followers = 'Followers',
    Following = 'Following'
}

export enum MessageSort {
    MostRecent = 'time',
    MostFollowed = 'followers',
    MostClout = 'clout',
    LargestHolder = 'holders',
}

export enum NftType {
    Single = 'Single',
    Multiple = 'Multiple'
}

export enum ProfileScreenTab {
    Posts = 'Posts',
    CreatorCoin = 'Creator Coin',
    Stats = 'Stats',
    Diamonds = 'Diamonds'
}

export enum NotificationSetting {
    Active = 'Active',
    Like = 'Like',
    Follow = 'Follow',
    Comment = 'Comment',
    Mention = 'Mention',
    Reclout = 'Reclout',
    Diamond = 'Diamond',
    Monetary = 'Monetary',
    OnlyVerified = 'OnlyVerified'
}

export enum WalletTab {
    Purchased = 'Purchased',
    Received = 'Received'
}

export enum CloutCastAction {
    ReClout = 'ReClout',
    Quote = 'Quote',
    Comment = 'Comment'
}
