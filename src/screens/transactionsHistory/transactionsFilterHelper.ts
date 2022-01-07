import { NotificationType, Transaction, TransactionsFilter } from '@types';

function checkBasicTransfer(transaction: Transaction) {
    const senderPublicKey = transaction.TransactionMetadata.TransactorPublicKeyBase58Check;
    const receiverPublicKey = transaction.TransactionMetadata.AffectedPublicKeys?.find(p => p.PublicKeyBase58Check !== senderPublicKey)?.PublicKeyBase58Check;

    return senderPublicKey && receiverPublicKey &&
        transaction.TransactionType === NotificationType.BasicTransfer &&
        transaction.TransactionMetadata.BasicTransferTxindexMetadata?.DiamondLevel === 0;
}

function checkCreatorCoinInvestment(transaction: Transaction, userPublicKey: string) {
    const transactorPublicKey = transaction.TransactionMetadata.TransactorPublicKeyBase58Check;
    const creatorPublicKey = transaction.TransactionMetadata.AffectedPublicKeys?.find(p => p.Metadata === 'CreatorPublicKey')?.PublicKeyBase58Check;

    return transactorPublicKey === userPublicKey && creatorPublicKey &&
        transaction.TransactionType === NotificationType.CreatorCoin;
}

function checkDiamond(transaction: Transaction) {
    const senderPublicKey = transaction.TransactionMetadata.TransactorPublicKeyBase58Check;
    const receiverPublicKey = transaction.TransactionMetadata.AffectedPublicKeys?.find(p => p.PublicKeyBase58Check !== senderPublicKey)?.PublicKeyBase58Check;
    const diamondLevel = transaction.TransactionMetadata.BasicTransferTxindexMetadata?.DiamondLevel;

    return senderPublicKey && receiverPublicKey &&
        transaction.TransactionType === NotificationType.BasicTransfer &&
        diamondLevel != null && diamondLevel > 0;
}

export function filterTransactions(transactions: Transaction[], filter: TransactionsFilter[], userPublicKey: string): Transaction[] {
    const filteredTransactions: Transaction[] = [];

    const fundTransfers = filter.length === 0 || filter.indexOf(TransactionsFilter.FundTransfers) !== -1;
    const creatorCoinsInvestments = filter.length === 0 || filter.indexOf(TransactionsFilter.CreatorCoinsInvestments) !== -1;
    const diamonds = filter.length === 0 || filter.indexOf(TransactionsFilter.Diamonds) !== -1;

    for (const transaction of transactions) {
        if (fundTransfers && checkBasicTransfer(transaction)) {
            filteredTransactions.push(transaction);
        } else if (creatorCoinsInvestments && checkCreatorCoinInvestment(transaction, userPublicKey)) {
            filteredTransactions.push(transaction);
        } else if (diamonds && checkDiamond(transaction)) {
            filteredTransactions.push(transaction);
        }
    }

    return filteredTransactions;
}
