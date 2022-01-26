import { crypto } from './crypto';
import * as Random from 'expo-random';
import { AuthenticatedUser, AuthenticatedUserEncryptionKey, AuthenticatedUserTypes, DerivedAuthentication, DerivedAuthenticatedUser, SecureStoreAuthenticatedUserEncryptionKeys, SecureStoreAuthenticatedUsers } from '@types';
import * as SecureStore from 'expo-secure-store';
import { constants } from '@globals';

async function getAuthenticatedUserPublicKeys(): Promise<string[]> {
    let publicKeys: string[] = [];

    const usersJson = await SecureStore.getItemAsync(constants.secureStore_authenticatedUsers);

    let users: SecureStoreAuthenticatedUsers = {};

    if (usersJson) {
        users = JSON.parse(usersJson);
        publicKeys = Object.keys(users);
    }

    return publicKeys;
}

async function getAuthenticatedUser(publicKey: string): Promise<{ user: AuthenticatedUser | DerivedAuthenticatedUser, key: AuthenticatedUserEncryptionKey }> {
    const usersJson = await SecureStore.getItemAsync(constants.secureStore_authenticatedUsers);

    let users: SecureStoreAuthenticatedUsers = {};
    if (usersJson) {
        users = JSON.parse(usersJson);
    }

    const keyJson = await SecureStore.getItemAsync(constants.secureStore_authenticatedUsersEncryptionKeys);
    let keys: SecureStoreAuthenticatedUserEncryptionKeys = {};
    if (keyJson) {
        keys = JSON.parse(keyJson);
    }

    let user = users[publicKey];

    if (user.derived) {
        const key = user.publicKey + constants.secureStore_derivedAuthentication;
        const derivedUserJson = await SecureStore.getItemAsync(key);
        if (derivedUserJson) {
            user = JSON.parse(derivedUserJson);
        }
    }

    const key = keys[publicKey];

    return { user, key };
}

function authenticateUser(
    mnemonic: string,
    extraText?: string,
): AuthenticatedUserTypes {
    const keychain = crypto.mnemonicToKeychain(mnemonic, extraText);
    const keychainNonStandard = crypto.mnemonicToKeychain(mnemonic, extraText, true);

    const keychainPublicKey = keychain.publicKey.toString('hex');
    const keychainNonStandardPublicKey = keychainNonStandard.publicKey.toString('hex');

    const user: AuthenticatedUserTypes = {
        standard: generateUserCredentials(keychain),
        nonStandard: undefined
    };

    if (keychainPublicKey !== keychainNonStandardPublicKey) {
        user.nonStandard = generateUserCredentials(keychainNonStandard);
    }

    return user;
}

function generateUserCredentials(keychain: any): { authenticatedUser: AuthenticatedUser, key: AuthenticatedUserEncryptionKey } {
    const seedHex = crypto.keychainToSeedHex(keychain);

    const privateKey = crypto.seedHexToPrivateKey(seedHex);
    const publicKey = crypto.privateKeyToDeSoPublicKey(privateKey);

    const randomKey = new Buffer(Random.getRandomBytes(32));
    const iv = new Buffer(Random.getRandomBytes(16));
    const seedHexBuffer = new Buffer(seedHex);
    const encryptedSeedHex = crypto.aesEncrypt(iv, randomKey, seedHexBuffer);

    const authenticatedUser: AuthenticatedUser = {
        publicKey: publicKey,
        encryptedSeedHex: encryptedSeedHex,
        derived: false
    };

    const key: AuthenticatedUserEncryptionKey = {
        key: randomKey.toString('hex'),
        iv: iv.toString('hex')
    };

    return { authenticatedUser, key };
}

function encryptDerivedAuthenticatedUser(derivedAuthentication: DerivedAuthentication): { derivedAuthenticatedUser: DerivedAuthenticatedUser, key: AuthenticatedUserEncryptionKey } {
    const randomKey = new Buffer(Random.getRandomBytes(32));
    const iv = new Buffer(Random.getRandomBytes(16));

    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 26);

    const derivedAuthenticatedUser: DerivedAuthenticatedUser = {
        publicKey: derivedAuthentication.publicKeyBase58Check,
        derivedPublicKey: derivedAuthentication.derivedPublicKeyBase58Check,
        compressedDerivedPublicKey: derivedAuthentication.compressedDerivedPublicKey,
        expirationBlock: derivedAuthentication.expirationBlock,
        encryptedDerivedSeedHex: crypto.aesEncrypt(iv, randomKey, Buffer.from(derivedAuthentication.derivedSeedHex)),
        encryptedJwt: crypto.aesEncrypt(iv, randomKey, Buffer.from(derivedAuthentication.jwt)),
        encryptedDerivedJwt: crypto.aesEncrypt(iv, randomKey, Buffer.from(derivedAuthentication.derivedJwt)),
        encryptedAccessSignature: crypto.aesEncrypt(iv, randomKey, Buffer.from(derivedAuthentication.accessSignature)),
        derived: true,
        expireDate
    };

    const key: AuthenticatedUserEncryptionKey = {
        key: randomKey.toString('hex'),
        iv: iv.toString('hex')
    };

    return { derivedAuthenticatedUser, key };
}

async function addAuthenticatedUser(user: AuthenticatedUser | DerivedAuthenticatedUser, key: AuthenticatedUserEncryptionKey) {
    const usersJson = await SecureStore.getItemAsync(constants.secureStore_authenticatedUsers);

    let users: SecureStoreAuthenticatedUsers = {};

    if (usersJson) {
        users = JSON.parse(usersJson);
    }

    if (user.derived) {
        const authenticatedUser: AuthenticatedUser = {
            publicKey: user.publicKey,
            encryptedSeedHex: (user as DerivedAuthenticatedUser).encryptedDerivedSeedHex,
            derived: true
        };
        users[user.publicKey] = authenticatedUser;
        const key = user.publicKey + constants.secureStore_derivedAuthentication;
        await SecureStore.setItemAsync(key, JSON.stringify(user));
    } else {
        users[user.publicKey] = user;
    }

    const newUsersJson = JSON.stringify(users);
    await SecureStore.setItemAsync(constants.secureStore_authenticatedUsers, newUsersJson);

    const keyJson = await SecureStore.getItemAsync(constants.secureStore_authenticatedUsersEncryptionKeys);

    let keys: SecureStoreAuthenticatedUserEncryptionKeys = {};

    if (keyJson) {
        keys = JSON.parse(keyJson);
    }

    keys[user.publicKey] = key;

    const newKeysJson = JSON.stringify(keys);
    await SecureStore.setItemAsync(constants.secureStore_authenticatedUsersEncryptionKeys, newKeysJson);
}

async function removeAuthenticatedUser(publicKey: string) {
    const usersJson = await SecureStore.getItemAsync(constants.secureStore_authenticatedUsers);

    let users: SecureStoreAuthenticatedUsers = {};

    if (usersJson) {
        users = JSON.parse(usersJson);
    }

    const derived = users[publicKey]?.derived;

    if (derived) {
        const key = publicKey + constants.secureStore_derivedAuthentication;
        await SecureStore.deleteItemAsync(key);
    }

    delete users[publicKey];

    const newUsersJson = JSON.stringify(users);
    await SecureStore.setItemAsync(constants.secureStore_authenticatedUsers, newUsersJson);

    const keyJson = await SecureStore.getItemAsync(constants.secureStore_authenticatedUsersEncryptionKeys);

    let keys: SecureStoreAuthenticatedUserEncryptionKeys = {};

    if (keyJson) {
        keys = JSON.parse(keyJson);
    }

    delete keys[publicKey];

    const newKeysJson = JSON.stringify(keys);
    await SecureStore.setItemAsync(constants.secureStore_authenticatedUsersEncryptionKeys, newKeysJson);
}

async function isAuthenticatedUserDerived(publicKey: string): Promise<boolean> {
    const usersJson = await SecureStore.getItemAsync(constants.secureStore_authenticatedUsers);

    let users: SecureStoreAuthenticatedUsers = {};
    if (usersJson) {
        users = JSON.parse(usersJson);
        return users[publicKey]?.derived;
    }

    return false;
}

export const authentication = {
    getAuthenticatedUserPublicKeys,
    getAuthenticatedUser,
    authenticateUser,
    addAuthenticatedUser,
    removeAuthenticatedUser,
    encryptDerivedAuthenticatedUser,
    isAuthenticatedUserDerived
};
