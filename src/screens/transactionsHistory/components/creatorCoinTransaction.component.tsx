import React from 'react';
import { Profile, Transaction } from '@types';
import { StyleSheet, Text, View } from 'react-native';
import ProfileInfoCardComponent from '@components/profileInfo/profileInfoCard.component';
import { ParamListBase } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { themeStyles } from '@styles/globalColors';
import { calculateAndFormatDeSoInUsd } from '@services/deSoCalculator';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
    userPublicKey: string;
    navigation: StackNavigationProp<ParamListBase>;
    transaction: Transaction;
    profilesMap: { [publicKey: string]: Profile }
}

export class CreatorCoinTransaction extends React.Component<Props>{

    constructor(props: Props) {
        super(props);
    }

    shouldComponentUpdate(prevProps: Props) {
        return prevProps.transaction.TransactionIDBase58Check !== this.props.transaction.TransactionIDBase58Check;
    }

    render() {
        const transaction = this.props.transaction;

        const transactorPublicKey = transaction.TransactionMetadata.TransactorPublicKeyBase58Check;
        const creatorPublicKey = transaction.TransactionMetadata.AffectedPublicKeys?.find(p => p.Metadata === 'CreatorPublicKey')?.PublicKeyBase58Check;
        const creatorCoinMetadata = transaction.TransactionMetadata.CreatorCoinTxindexMetadata;

        if (transactorPublicKey !== this.props.userPublicKey || !creatorPublicKey || !creatorCoinMetadata) {
            return <></>;
        }

        const creatorProfile = this.props.profilesMap[creatorPublicKey];

        let usdAmount = '';

        if (creatorCoinMetadata.OperationType === 'buy') {
            usdAmount = calculateAndFormatDeSoInUsd(creatorCoinMetadata.DeSoToSellNanos);
        } else {
            usdAmount = calculateAndFormatDeSoInUsd(-creatorCoinMetadata.DESOLockedNanosDiff);
        }

        return <View style={[styles.container, themeStyles.borderColor]}>
            <ProfileInfoCardComponent profile={creatorProfile} navigation={this.props.navigation} />
            <View style={styles.operationContainer}>
                <View style={styles.operationTextWrapper}>
                    <Text style={[styles.operationText, themeStyles.fontColorMain]}>{creatorCoinMetadata.OperationType.toUpperCase()}</Text>
                    <Text style={[styles.amount, themeStyles.fontColorMain]}>~${usdAmount}</Text>
                </View>
                <MaterialCommunityIcons name='circle' size={22} color={creatorCoinMetadata.OperationType === 'buy' ? '#30c296' : '#e24c4f'} />
            </View>
        </View>;
    }
}

const styles = StyleSheet.create(
    {
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
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
            fontWeight: '600',
            fontSize: 12
        }
    }
);
