import { SelectListControl } from '@controls/selectList.control';
import { themeStyles } from '@styles';
import React from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import Modal from 'react-native-modal';
import { TransactionsFilter } from '@types';

interface Props {
    filter: TransactionsFilter[];
    isFilterShown: boolean;
    onFilterChange: (filter: TransactionsFilter[]) => void;
}

interface State {
    filter: TransactionsFilter[];
}

export class TransactionsFilterComponent extends React.Component<Props, State> {

    constructor(props: Props) {
        super(props);

        this.state = {
            filter: this.props.filter
        };

        this.onFilterValueChange = this.onFilterValueChange.bind(this);
        this.onDone = this.onDone.bind(this);
    }

    onFilterValueChange(value: TransactionsFilter[]) {
        this.setState({ filter: value });
    }

    onDone() {
        this.props.onFilterChange(this.state.filter);
    }

    render() {
        return <Modal
            animationIn={'slideInUp'}
            animationOutTiming={500}
            swipeDirection={'down'}
            onSwipeComplete={this.onDone}
            onBackdropPress={this.onDone}
            onBackButtonPress={this.onDone}
            isVisible={this.props.isFilterShown}
            propagateSwipe={true}
            style={[styles.modal]}>
            <ScrollView style={[styles.container, themeStyles.modalBackgroundColor]} bounces={false}>
                <View style={[styles.headerContainer, themeStyles.recloutBorderColor]}>
                    <Text style={[styles.showText, themeStyles.fontColorMain]}>Filter By</Text>
                </View>
                <SelectListControl
                    style={[styles.selectList]}
                    options={[
                        {
                            name: 'Fund Transfers',
                            value: TransactionsFilter.FundTransfers
                        },
                        {
                            name: 'CC Investments',
                            value: TransactionsFilter.CreatorCoinsInvestments
                        },
                        {
                            name: 'Diamonds',
                            value: TransactionsFilter.Diamonds
                        }
                    ]}
                    value={this.state.filter}
                    onValueChange={(value: string | string[]) => this.onFilterValueChange(value as TransactionsFilter[])}
                    multiple
                >
                </SelectListControl>
            </ScrollView>
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
            height: '75%',
            maxHeight: 525,
            marginTop: 'auto',
            borderTopRightRadius: 20,
            borderTopLeftRadius: 20,
            paddingTop: 30
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
