import { globals } from '@globals/globals';
import { api } from '@services';
import React, { Component } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Image, Platform, StyleSheet, Text, View, TextInput, ScrollView, Alert } from 'react-native';
import { Profile } from '@types';
import { themeStyles } from '@styles/globalColors';
import { ImageInfo } from 'expo-image-picker/build/ImagePicker.types';
import { NavigationProp } from '@react-navigation/core';
import { settingsGlobals } from '@globals/settingsGlobals';
import { signing } from '@services/authorization/signing';
import CloutFeedLoader from '@components/loader/cloutFeedLoader.component';
import CloutFeedButton from '@components/cloutfeedButton.component';
import { ParamListBase } from '@react-navigation/native';
import { UserContext } from '@globals/userContext';
import * as FileSystem from 'expo-file-system';

interface Props {
    navigation: NavigationProp<ParamListBase>
}

interface State {
    profilePic: string,
    username: string,
    description: string,
    founderReward: string,
    isLoading: boolean
}

export class EditProfileScreen extends Component<Props, State> {

    private _isMounted = false;

    static contextType = UserContext;

    constructor(props: Props) {
        super(props);
        this.state = {
            profilePic: '',
            username: '',
            description: '',
            founderReward: '',
            isLoading: true,
        };

        this.pickImage = this.pickImage.bind(this);
        this.updateProfile = this.updateProfile.bind(this);
        this.handleDescriptionChange = this.handleDescriptionChange.bind(this);
        this.handleFounderRewardsChange = this.handleFounderRewardsChange.bind(this);
    }

    componentDidMount(): void {
        this.updateNavigation();
        this.loadSingleProfile();
        this._isMounted = true;
    }

    componentWillUnmout(): void {
        this._isMounted = false;
    }

    private updateNavigation(): void {
        this.props.navigation.setOptions({
            headerRight: () => <CloutFeedButton
                title={'Save'}
                onPress={this.updateProfile}
                styles={styles.button}
            />
            ,
            headerTitleStyle: {
                color: themeStyles.fontColorMain.color,
                alignSelf: 'center'
            }
        });
    }

    private async updateProfile(): Promise<void> {
        if (this.state.isLoading) {
            return;
        }

        const username = this.state.username.trim();
        if (!username) {
            Alert.alert('Error', 'Please enter a username.');
            return;
        }

        const description = this.state.description.trim();
        if (!description) {
            Alert.alert('Error', 'Please enter a description.');
            return;
        }

        const founderRewardText: string = this.state.founderReward.trim();
        if (!founderRewardText) {
            Alert.alert('Error', 'Please enter a founder reward.');
            return;
        }

        if (this._isMounted) {
            this.setState({ isLoading: true });
        }

        const oldProfileImage = api.getSingleProfileImage(globals.user.publicKey);
        let profilePic = this.state.profilePic;

        if (profilePic.replace(/\?.*/, '') === oldProfileImage) {
            try {
                const { uri } = await FileSystem.downloadAsync(
                    this.state.profilePic,
                    FileSystem.documentDirectory + 'bufferimg.png'
                );
                profilePic = await FileSystem.readAsStringAsync(uri, { encoding: 'base64', });
            } catch { }
        }

        const founderReward = Number(founderRewardText) * 100;

        api.updateProfile(
            globals.user.publicKey, username, description, profilePic, founderReward
        ).then(
            async p_response => {
                const transactionHex = p_response.TransactionHex;
                const signedTransaction = await signing.signTransaction(transactionHex);
                await api.submitTransaction(signedTransaction).then(
                    () => {
                        if (this._isMounted) {
                            if (globals.user.username !== this.state.username) {
                                globals.user.username = this.state.username;
                            }
                            setTimeout(() => this.props.navigation.navigate('Profile', { profileUpdated: true }), 2000);
                        }
                    },
                    p_error => {
                        if (this._isMounted) {
                            this.setState({ isLoading: false });
                            globals.defaultHandleError(p_error);
                        }
                    }
                );
                this.context.setProfilePic(this.state.profilePic);
            }
        ).catch(
            p_error => {
                if (this._isMounted) {
                    this.setState({ isLoading: false });

                    const usernameExists = !!p_error?.error && p_error.error.indexOf('Username') !== -1 && p_error.error.indexOF('already exists') !== -1;

                    if (usernameExists) {
                        Alert.alert('Username exists', `The username ${this.state.username} already exists. Please choose a different username.`);
                    } else {
                        globals.defaultHandleError(p_error);
                    }
                }
            }
        );
    }

    private async pickImage(): Promise<void> {
        if (Platform.OS !== 'web') {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                alert('In order to be able to choose one of your images and attach it to your comment, we need access to your photos.');
                return;
            }
        }

        const result = await ImagePicker.launchImageLibraryAsync(
            {
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 1,
                aspect: [4, 3],
                base64: true
            }
        );

        if (!result.cancelled && result.type === 'image') {
            const base64 = (result as ImageInfo).base64 as string;
            const base64Image = base64;
            if (this._isMounted) {
                this.setState({ profilePic: `data:image/jpg;base64,${base64Image}` });
            }
        }
    }

    private async loadSingleProfile(): Promise<void> {
        try {
            const response = await api.getSingleProfile(globals.user.username);
            const newProfile = response.Profile as Profile;

            if (this._isMounted) {
                this.setState(
                    {
                        profilePic: api.getSingleProfileImage(`${globals.user.publicKey}?${new Date().toISOString()}`),
                        username: newProfile.Username,
                        description: newProfile.Description,
                        founderReward: String(newProfile.CoinEntry.CreatorBasisPoints / 100),
                        isLoading: false
                    }
                );
            }
        } catch {
            this.props.navigation.goBack();
        }
    }

    private handleDescriptionChange = (p_text: string): void => {
        if (this._isMounted) {
            this.setState({ description: p_text });
        }
    }

    private handleFounderRewardsChange = (p_text: string): void => {
        const numberText = p_text.split(',').join('.');
        const founderRewardNumber = Number(numberText);

        if (founderRewardNumber >= 0 && founderRewardNumber <= 100 && this._isMounted) {
            this.setState({ founderReward: p_text });
        }
    }

    render(): JSX.Element {
        if (this.state.isLoading) {
            return (
                <CloutFeedLoader />
            );
        }

        return (
            <ScrollView style={[styles.scrollView, themeStyles.containerColorMain]}>
                <View style={[styles.container, themeStyles.containerColorMain]}>
                    <View style={[styles.profilePicContainer]}>
                        <Image
                            style={styles.profilePic}
                            source={{ uri: this.state.profilePic ? this.state.profilePic : 'https://i.imgur.com/vZ2mB1W.png' }}
                        />
                    </View>
                    <CloutFeedButton
                        title={'Change Image'}
                        onPress={this.pickImage}
                        styles={styles.button} />
                    <View style={[styles.inputContainer]}>
                        <Text style={[themeStyles.fontColorSub]}>Username</Text>
                        <TextInput
                            style={[styles.textInput, themeStyles.fontColorMain, themeStyles.borderColor]}
                            value={this.state.username}
                            onChangeText={(p_text: string) => {
                                this.setState({ username: p_text });
                            }}
                            keyboardAppearance={settingsGlobals.darkMode ? 'dark' : 'light'}
                        />
                    </View>
                    <View style={[styles.inputContainer]}>
                        <Text style={[themeStyles.fontColorSub]}>Description</Text>
                        <TextInput
                            style={[styles.textInput, themeStyles.fontColorMain, themeStyles.borderColor]}
                            value={this.state.description}
                            multiline={true}
                            onChangeText={this.handleDescriptionChange}
                            keyboardAppearance={settingsGlobals.darkMode ? 'dark' : 'light'}
                        />
                    </View>
                    <View style={[styles.inputContainer]}>
                        <Text style={[themeStyles.fontColorSub]}>Founder reward percentage</Text>
                        <TextInput
                            style={[styles.textInput, themeStyles.fontColorMain, themeStyles.borderColor]}
                            keyboardType='numeric'
                            value={this.state.founderReward}
                            onChangeText={this.handleFounderRewardsChange}
                            keyboardAppearance={settingsGlobals.darkMode ? 'dark' : 'light'}
                        />
                    </View>
                </View>

                <View style={{ height: 500 }}></View>
            </ScrollView>
        );
    }
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1
    },
    container: {
        flex: 1,
        alignItems: 'center'
    },
    profilePicContainer: {
        marginTop: '10%',
        marginBottom: 10,
        marginRight: 10
    },
    profilePic: {
        height: 100,
        width: 100,
        borderRadius: 16,
    },
    button: {
        marginRight: 10,
    },
    inputContainer: {
        width: '96%',
        marginTop: 10
    },
    textInput: {
        borderColor: 'gray',
        borderBottomWidth: 1,
        paddingVertical: 4,
        width: '100%',
        marginBottom: 16
    }
});

export default EditProfileScreen;
