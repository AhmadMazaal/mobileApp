export interface AuthenticatedUserTypes {
    standard: { authenticatedUser: AuthenticatedUser, key: AuthenticatedUserEncryptionKey },
    nonStandard: { authenticatedUser: AuthenticatedUser, key: AuthenticatedUserEncryptionKey } | undefined
}

export interface SecureStoreAuthenticatedUsers {
    [key: string]: AuthenticatedUser;
}

export interface SecureStoreAuthenticatedUserEncryptionKeys {
    [key: string]: AuthenticatedUserEncryptionKey;
}

export interface AuthenticatedUser {
    publicKey: string;
    encryptedSeedHex: string;
    derived: boolean;
}

export interface DerivedAuthenticatedUser {
    publicKey: string;
    derivedPublicKey: string;
    compressedDerivedPublicKey: string;
    encryptedDerivedSeedHex: string;
    encryptedDerivedJwt: string;
    encryptedJwt: string;
    encryptedAccessSignature: string;
    expirationBlock: number;
    derived: true;
    expireDate: Date;
}

export interface AuthenticatedUserEncryptionKey {
    key: string;
    iv: string;
}

export interface DerivedAuthentication {
    accessSignature: string;
    derivedJwt: string;
    derivedPublicKeyBase58Check: string;
    compressedDerivedPublicKey: string;
    derivedSeedHex: string;
    expirationBlock: number;
    jwt: string;
    publicKeyBase58Check: string;
}
