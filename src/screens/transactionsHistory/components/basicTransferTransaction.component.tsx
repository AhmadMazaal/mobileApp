import React from 'react';
import { Profile, Transaction } from '@types';
import { StyleSheet, Text, View } from 'react-native';
import ProfileInfoCardComponent from '@components/profileInfo/profileInfoCard.component';
import { ParamListBase } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Entypo } from '@expo/vector-icons';
import { themeStyles } from '@styles/globalColors';
import { calculateAndFormatDeSoInUsd } from '@services/deSoCalculator';

interface Props {
    userPublicKey: string;
    navigation: StackNavigationProp<ParamListBase>;
    transaction: Transaction;
    profilesMap: { [publicKey: string]: Profile }
}

export class BasicTransferTransaction extends React.Component<Props>{

    constructor(props: Props) {
        super(props);
    }

    shouldComponentUpdate(prevProps: Props) {
        return prevProps.transaction.TransactionIDBase58Check !== this.props.transaction.TransactionIDBase58Check;
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

        const outputFunds = transaction.Outputs.find(
            output => output.PublicKeyBase58Check === receiverPublicKey
        );

        let usdAmount = '';

        if (outputFunds) {
            usdAmount = calculateAndFormatDeSoInUsd(outputFunds.AmountNanos);
        }

        return <View style={[styles.container, themeStyles.borderColor]}>
            <ProfileInfoCardComponent profile={targetProfile} navigation={this.props.navigation} noCoinPrice={false} />

            <View style={styles.operationContainer}>
                <View style={styles.operationTextWrapper}>
                    <Text style={[styles.operationText, themeStyles.fontColorMain]}>{send ? 'SEND' : 'RECEIVE'}</Text>
                    <Text style={[styles.amount, themeStyles.fontColorMain]}>~${usdAmount}</Text>
                </View>
                <Entypo name={send ? 'arrow-up' : 'arrow-down'} size={28} color={send ? '#e24c4f' : '#30c296'} />
            </View>
        </View>;
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
        amount: {
            fontWeight: '600'
        }
    }
);
