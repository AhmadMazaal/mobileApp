import React from 'react';
import { Profile, Transaction } from '@types';
import { StyleSheet, Text, View } from 'react-native';
import ProfileInfoCardComponent from '@components/profileInfo/profileInfoCard.component';
import { ParamListBase } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { FontAwesome, Entypo } from '@expo/vector-icons';
import { themeStyles } from '@styles/globalColors';
import { TouchableOpacity } from 'react-native-gesture-handler';

interface Props {
    userPublicKey: string;
    navigation: StackNavigationProp<ParamListBase>;
    transaction: Transaction;
    profilesMap: { [publicKey: string]: Profile }
}

export class DiamondTransaction extends React.Component<Props>{

    constructor(props: Props) {
        super(props);
    }

    shouldComponentUpdate(prevProps: Props) {
        return prevProps.transaction.TransactionIDBase58Check !== this.props.transaction.TransactionIDBase58Check;
    }

    private goToPost(postHashHex: string): void {
        try {
            this.props.navigation.navigate('Post', {
                postHashHex: postHashHex,
                showThread: true
            });
        } catch {
            alert('Something went wrong! Please try again.');
        }
    }

    render() {
        const transaction = this.props.transaction;

        const senderPublicKey = transaction.TransactionMetadata.TransactorPublicKeyBase58Check;
        const receiverPublicKey = transaction.TransactionMetadata.AffectedPublicKeys?.find(p => p.PublicKeyBase58Check !== senderPublicKey)?.PublicKeyBase58Check;

        if (!senderPublicKey || !receiverPublicKey) {
            return <></>;
        }

        const senderProfile = this.props.profilesMap[senderPublicKey];
        const receiverProfile = this.props.profilesMap[receiverPublicKey];

        const send = senderPublicKey === this.props.userPublicKey;
        const targetProfile = send ? receiverProfile : senderProfile;

        const diamondLevel = transaction.TransactionMetadata.BasicTransferTxindexMetadata?.DiamondLevel as number;
        const postHashHex = transaction.TransactionMetadata.BasicTransferTxindexMetadata?.PostHashHex as string;

        return <TouchableOpacity activeOpacity={0.7} onPress={() => this.goToPost(postHashHex)}>
            <View style={[styles.container, themeStyles.borderColor]}>
                <ProfileInfoCardComponent profile={targetProfile} navigation={this.props.navigation} noCoinPrice={false} />

                <View style={styles.operationContainer}>
                    <View style={styles.operationTextWrapper}>
                        <Text style={[styles.operationText, themeStyles.fontColorMain]}>{send ? 'SEND' : 'RECEIVE'}</Text>
                        <View style={styles.row}>
                            {
                                Array(diamondLevel).fill(0).map(
                                    (_i, index) =>
                                        <FontAwesome style={styles.diamondIcon} name='diamond' size={14} color={themeStyles.diamondColor.color} key={index} />
                                )
                            }
                        </View>
                    </View>
                    <Entypo name={send ? 'arrow-up' : 'arrow-down'} size={28} color={send ? '#e24c4f' : '#30c296'} />
                </View>
            </View>
        </TouchableOpacity>;
    }
}

const styles = StyleSheet.create(
    {
        container: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 10,
            paddingVertical: 12,
            borderBottomWidth: 1
        },
        operationContainer: {
            flexDirection: 'row',
            alignItems: 'center'
        },
        operationTextWrapper: {
            alignItems: 'flex-end',
            marginRight: 8
        },
        operationText: {
            fontWeight: '600',
            marginBottom: 2
        },
        row: {
            flexDirection: 'row'
        },
        diamondIcon: {
            marginLeft: 2
        }
    }
);
