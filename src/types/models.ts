import { NotificationType } from './enums';

export interface User {
    publicKey: string;
}

export interface CoinEntry {
    DeSoLockedNanos: number
    CoinWatermarkNanos: number;
    CoinsInCirculationNanos: number;
    CreatorBasisPoints: number;
}

export interface User {
    BalanceNanos: number;
    BlockedPubKeys: any;
    CanCreateProfile: boolean;
    HasPhoneNumber: boolean;
    IsAdmin: boolean;
    ProfileEntryResponse: Profile;
    PublicKeyBase58Check: string;
    PublicKeysBase58CheckFollowedByUser: string[];
    UsersWhoHODLYou: CreatorCoinHODLer[];
    UsersYouHODL: CreatorCoinHODLer[];
}

export interface Profile {
    ProfilePic: string;
    Username: string;
    Description: string;
    PublicKeyBase58Check: string;
    CoinPriceDeSoNanos: number;
    CoinEntry: CoinEntry;
    IsVerified: boolean;
    CoinPriceUSD?: number;
    FormattedCoinPriceUSD?: string;
    Posts: Post[];
    UsersThatHODL?: CreatorCoinHODLer[];
}

export interface PostReaderState {
    LikedByReader: boolean;
    RepostedByReader: boolean;
    RepostPostHashHex?: string;
    DiamondLevelBestowed: number;
}

export interface PostExtraData {
    EmbedVideoURL: string;
}

export interface Post {
    PostHashHex: string;
    Body: string;
    ImageURLs: string[];
    VideoURLs: string[];
    TimestampNanos: number;
    ProfileEntryResponse: Profile;
    LikeCount: number;
    PostEntryReaderState: PostReaderState;
    CommentCount: number;
    Comments: Post[];
    RepostCount: number;
    RepostedPostEntryResponse: Post;
    DiamondCount: number;
    ParentStakeID: string;
    PostExtraData: PostExtraData;
    ConfirmationBlockHeight: number;
    CreatorBasisPoints: number;
    InGlobalFeed: boolean;
    InMempool: boolean;
    IsHidden: boolean;
    IsPinned: boolean;
    ParentPosts: Post;
    PosterPublicKeyBase58Check: string;
    StakeMultipleBasisPoints: number;
    QuoteRepostCount: number;
    IsNFT: boolean;
    SerialNumber: number;
    NumNFTCopies: number;
    NumNFTCopiesForSale: number;
    IsForSale?: boolean;
    HighestBidAmountNanos: number;
    LastAcceptedBidAmountNanos: number;
    LowestBidAmountNanos: number;
    MinBidAmountNanos: number;
    OwnerPublicKeyBase58Check: string;
    BidAmountNanos: number;
    NFTRoyaltyToCoinBasisPoints: number;
    NFTRoyaltyToCreatorBasisPoints: number;
}

export interface NotificationLikeMetaData {
    IsUnlike: boolean;
    PostHashHex: string;
}

export interface NotificationFollowMetaData {
    IsUnfollow: boolean;
}

export interface NotificationSubmitPostMetaData {
    ParentPostHashHex: string;
    PostHashBeingModifiedHex: string;
}

export interface NotificationCreatorCoinMetaData {
    DeSoToAddNanos: number;
    DeSoToSellNanos: number;
    CreatorCoinToSellNanos: number;
    OperationType: string;
    DESOLockedNanosDiff: number;
}

export interface NotificationCreatorCoinTransferMetaData {
    CreatorCoinToTransferNanos: number;
    CreatorUsername: string;
    DiamondLevel: number;
    PostHashHex: string;
}

export interface NotificationBasicTransferMetaData {
    DiamondLevel: number;
    PostHashHex: string;
}

export interface NotificationNftBidMetaData {
    BidAmountNanos: number;
    NFTPostHashHex: string;
    SerialNumber: number;
}

export interface NotificationTransactionOutputResponse {
    AmountNanos: number;
    PublicKeyBase58Check: string;
}

export interface NotificationMetaData {
    TxnType: NotificationType;
    TransactorPublicKeyBase58Check: string;
    CreatorCoinTxindexMetadata?: NotificationCreatorCoinMetaData;
    SubmitPostTxindexMetadata?: NotificationSubmitPostMetaData;
    FollowTxindexMetadata?: NotificationFollowMetaData;
    LikeTxindexMetadata?: NotificationLikeMetaData;
    CreatorCoinTransferTxindexMetadata?: NotificationCreatorCoinTransferMetaData;
    NFTBidTxindexMetadata?: NotificationNftBidMetaData;
    AcceptNFTBidTxindexMetadata?: NotificationNftBidMetaData;
    BasicTransferTxindexMetadata?: NotificationBasicTransferMetaData;
}

export interface Notification {
    Index: number;
    Metadata: NotificationMetaData;
    TxnOutputResponses: NotificationTransactionOutputResponse[];
}

export interface CreatorCoinHODLer {
    BalanceNanos: number;
    CreatorPublicKeyBase58Check: string;
    HODLerPublicKeyBase58Check: string;
    ProfileEntryResponse: Profile;
    HasPurchased: boolean;
}

export interface ContactWithMessages {
    Messages: Message[];
    NumMessagesRead: number;
    ProfileEntryResponse: Profile;
    PublicKeyBase58Check: string;
    CreatorCoinHoldingAmount?: number;
    UnreadMessages?: boolean;
    LastDecryptedMessage?: string;
}

export interface Message {
    DecryptedText?: string,
    EncryptedText: string;
    IsSender: boolean;
    RecipientPublicKeyBase58Check: string;
    SenderPublicKeyBase58Check: string;
    TstampNanos: number;
    LastOfGroup?: boolean;
    V2: boolean;
}

export interface DiamondSender {
    HighestDiamondLevel: number;
    ProfileEntryResponse: Profile;
    ReceiverPublicKeyBase58Check: string;
    SenderPublicKeyBase58Check: string;
    TotalDiamonds: string;
}

export interface CreatorCoinTransaction {
    transactorPublicKey: string;
    coinsInCirculation: number,
    coinsChange: number,
    coinPrice: number,
    bitcloutValue: number,
    usdValue: number;
    timeStamp: number
}

export interface CloutTag {
    clouttag: string;
    count: number;
}

export interface BidEdition {
    HighestBidAmountNanos: number;
    IsForSale: boolean;
    LastAcceptedBidAmountNanos: number;
    LowestBidAmountNanos: number;
    MinBidAmountNanos: number;
    OwnerPublicKeyBase58Check: string;
    SerialNumber: number;
}

export interface SearchHistoryProfile {
    Username: string;
    IsVerified: boolean;
    ProfilePic: string;
    PublicKeyBase58Check: string;
}

export interface LoginButton {
    title: string;
    label: string;
    action: () => void;
}

export interface TransactionMetaData {
    TransactorPublicKeyBase58Check: string;
    CreatorCoinTxindexMetadata?: NotificationCreatorCoinMetaData;
    SubmitPostTxindexMetadata?: NotificationSubmitPostMetaData;
    FollowTxindexMetadata?: NotificationFollowMetaData;
    LikeTxindexMetadata?: NotificationLikeMetaData;
    CreatorCoinTransferTxindexMetadata?: NotificationCreatorCoinTransferMetaData;
    NFTBidTxindexMetadata?: NotificationNftBidMetaData;
    AcceptNFTBidTxindexMetadata?: NotificationNftBidMetaData;
    BasicTransferTxindexMetadata?: NotificationBasicTransferMetaData;
    AffectedPublicKeys?: { PublicKeyBase58Check: string, Metadata: string }[];
}

export interface Transaction {
    TransactionIDBase58Check: string;
    TransactionType: NotificationType;
    TransactionMetadata: TransactionMetaData;
    Outputs: { PublicKeyBase58Check: string, AmountNanos: number }[];
}
