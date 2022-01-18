import { SelectListControl } from '@controls/selectList.control';
import { themeStyles } from '@styles/globalColors';
import React from 'react';
import { View, StyleSheet, Text, ScrollView, Dimensions } from 'react-native';
import Modal from 'react-native-modal';

interface Props {
    language: string;
    onSettingsChange: (language: string) => void;
    isSettingsShow: boolean;
}

interface State {
    language: string;
}

export class LanguageSettingsComponent extends React.Component<Props, State> {

    constructor(props: Props) {
        super(props);

        this.state = {
            language: this.props.language
        };

        this.onSettingValueChange = this.onSettingValueChange.bind(this);
        this.onDone = this.onDone.bind(this);
    }

    onSettingValueChange(value: string): void {
        this.setState({ language: value });
    }

    onDone(): void {
        this.props.onSettingsChange(this.state.language);
    }

    render(): JSX.Element {
        return <Modal
            animationIn={'slideInUp'}
            animationOutTiming={500}
            swipeDirection={'down'}
            onSwipeComplete={() => this.onDone()}
            onBackdropPress={() => this.onDone()}
            onBackButtonPress={() => this.onDone()}
            isVisible={this.props.isSettingsShow}
            propagateSwipe={true}
            style={[styles.modal]}>
            <View style={[styles.container, themeStyles.modalBackgroundColor]}>
                <ScrollView
                    contentContainerStyle={styles.containerContent}
                    bounces={false}>
                    <View style={[styles.headerContainer, themeStyles.recloutBorderColor]}>
                        <Text style={[styles.showText, themeStyles.fontColorMain]}>Language</Text>
                    </View>
                    <SelectListControl
                        style={[styles.selectList]}
                        options={[
                            {
                                name: 'English',
                                value: 'en'
                            },
                            {
                                name: 'Spanish',
                                value: 'es'
                            },
                            {
                                name: 'Dutch',
                                value: 'nl'
                            },
                            {
                                name: 'Chinese',
                                value: 'zh-CN'
                            },
                            {
                                name: 'Japanese',
                                value: 'ja'
                            },
                            {
                                name: 'Hindi',
                                value: 'hi'
                            },
                            {
                                name: 'Portuguese',
                                value: 'pt'
                            },
                            {
                                name: 'French',
                                value: 'fr'
                            },
                            {
                                name: 'Italian',
                                value: 'it'
                            },
                            {
                                name: 'German',
                                value: 'de'
                            },
                            {
                                name: 'Russian',
                                value: 'ru'
                            }
                        ]}
                        value={this.state.language}
                        onValueChange={(value: string | string[]) => this.onSettingValueChange(value as string)}
                    >
                    </SelectListControl>
                </ScrollView>
            </View>
        </Modal>;
    }
}

const styles = StyleSheet.create(
    {
        modal: {
            width: '100%',
            marginLeft: 0,
            marginBottom: 0
        },
        container: {
            height: Dimensions.get('window').height * 0.75,
            marginTop: 'auto',
            borderTopRightRadius: 20,
            borderTopLeftRadius: 20,
            paddingTop: 30
        },
        containerContent: {
            paddingBottom: 50
        },
        headerContainer: {
            borderBottomWidth: 1,
            width: '100%',
            alignItems: 'center',
            paddingBottom: 5
        },
        showText: {
            fontSize: 16,
            fontWeight: '700'
        },
        selectList: {
            width: '100%'
        }
    }
);
