import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Profile } from '../types';
import { ParamListBase, useNavigation } from '@react-navigation/native';
import { themeStyles } from '@styles';
import { constants, globals } from '@globals';
import { api, cache, checkIsFollowedBack } from '@services';
import { signing } from '@services/authorization/signing';
import CloutFeedButton from '@components/cloutfeedButton.component';
import ProfileInfoCardComponent from '@components/profileInfo/profileInfoCard.component';
import { StackNavigationProp } from '@react-navigation/stack';
import { SearchHistoryProfile } from '@types';

export function ProfileListCardComponent({ profile, isFollowing, handleSearchHistory }:
    { profile: Profile, isFollowing: boolean, handleSearchHistory?: (profile: SearchHistoryProfile) => void }): JSX.Element {

    const navigation = useNavigation<StackNavigationProp<ParamListBase>>();

    const [working, setWorking] = useState(false);
    const [following, setFollowing] = useState(false);
    const [showFollowButton, setShowFollowButton] = useState(false);
    const [isFollowButtonLoading, setIsFollowButtonLoading] = useState(true);
    const [isFollowingBack, setIsFollowingBack] = useState<boolean>(false);

    const isMounted = useRef<boolean>(true);

    useEffect(
        () => {

            if (isMounted.current) {
                setShowFollowButton(profile.PublicKeyBase58Check !== globals.user.publicKey);
                setFollowing(isFollowing);
                checkIsFollowedBack(profile?.PublicKeyBase58Check).then(
                    (isFollowing: boolean) => {
                        if (isMounted.current) {
                            setIsFollowingBack(isFollowing);
                            setIsFollowButtonLoading(false);
                        }
                    }
                ).catch(() => { });
            }

            return () => {
                isMounted.current = false;
            };
        },
        []
    );

    function onFollowButtonClick() {
        setWorking(true);
        api.createFollow(globals.user.publicKey, profile.PublicKeyBase58Check, following).then(
            async p_response => {
                const transactionHex = p_response.TransactionHex;

                if (profile.PublicKeyBase58Check === constants.cloutfeed_publicKey) {
                    globals.followerFeatures = !following;
                }

                const signedTransactionHex = await signing.signTransaction(transactionHex);
                await api.submitTransaction(signedTransactionHex);

                if (isMounted.current) {
                    setFollowing((p_previous) => !p_previous);
                }
                if (following) {
                    cache.removeFollower(profile.PublicKeyBase58Check);
                } else {
                    cache.addFollower(profile.PublicKeyBase58Check);
                }
            }
        ).catch(
            p_error => globals.defaultHandleError(p_error)
        ).finally(
            () => {
                if (isMounted.current) {
                    setWorking(false);
                }
            }
        );
    }

    function goToProfile(): void {
        if (profile.Username !== 'anonymous') {
            if (handleSearchHistory) {
                const newProfile: SearchHistoryProfile = {
                    Username: profile.Username,
                    PublicKeyBase58Check: profile.PublicKeyBase58Check,
                    IsVerified: profile.IsVerified,
                    ProfilePic: api.getSingleProfileImage(profile.PublicKeyBase58Check)
                };
                handleSearchHistory(newProfile);
            }
            navigation.push(
                'UserProfile',
                {
                    publicKey: profile.PublicKeyBase58Check,
                    username: profile.Username,
                    key: 'Profile_' + profile.PublicKeyBase58Check
                }
            );
        }
    }

    const buttonTitle = following ? 'Unfollow' : isFollowingBack ? 'Follow back' : 'Follow';

    return <TouchableOpacity onPress={goToProfile} activeOpacity={1}>
        <View style={[styles.profileListCard, themeStyles.containerColorMain]}>
            <ProfileInfoCardComponent
                customAction={goToProfile}
                profile={profile}
                navigation={navigation}
            />
            {
                showFollowButton && !globals.readonly ?
                    <View style={styles.followButtonContainer}>
                        <CloutFeedButton
                            isLoading={isFollowButtonLoading}
                            disabled={working}
                            styles={styles.followBtn}
                            title={buttonTitle}
                            onPress={onFollowButtonClick}
                        />
                    </View>
                    : undefined
            }
        </View>
    </TouchableOpacity>;
}

const styles = StyleSheet.create(
    {
        profileListCard: {
            flexDirection: 'row',
            paddingVertical: 16,
            paddingHorizontal: 10,
            width: '100%',
            alignItems: 'center'
        },
        followBtn: {
            width: 105
        },
        followButtonContainer: {
            marginLeft: 'auto',
            marginTop: 6,
            marginRight: 5
        },
    }
);
