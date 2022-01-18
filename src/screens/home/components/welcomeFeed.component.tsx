import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View, Text, StyleSheet, Linking, Image, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { PostComponent } from '@components/post/post.component';
import { Post } from '@types';
import { ParamListBase, RouteProp } from '@react-navigation/native';
import { themeStyles } from '@styles/globalColors';
import { globals } from '@globals/globals';
import { api, cache, deSocialApi } from '@services';
import { navigatorGlobals } from '@globals/navigatorGlobals';
import CloutFeedLoader from '@components/loader/cloutFeedLoader.component';
import { StackNavigationProp } from '@react-navigation/stack';

interface Props {
    navigation: StackNavigationProp<ParamListBase>;
    route: RouteProp<ParamListBase, string>;
}

interface State {
    posts: Post[];
    isLoading: boolean;
    isLoadingMore: boolean;
    isRefreshing: boolean;
}

export class WelcomeFeedComponent extends React.Component<Props, State> {

    private _flatListRef: React.RefObject<FlatList>;

    private _currentScrollPosition = 0;

    private _lastPostHashHex = '';

    private _noMoreData = false;

    private _isMounted = false;

    constructor(props: Props) {
        super(props);

        this.state = {
            posts: [],
            isLoading: true,
            isLoadingMore: false,
            isRefreshing: false
        };

        this._flatListRef = React.createRef();
        navigatorGlobals.refreshHome = () => {
            if (this._currentScrollPosition > 0 || !this._flatListRef.current) {
                this._flatListRef.current?.scrollToOffset({ animated: true, offset: 0 });
            } else {
                this.refresh(false);
            }
        };

        this.refresh();

        this.refresh = this.refresh.bind(this);
    }

    componentDidMount(): void {
        this._isMounted = true;
    }

    componentWillUnmount(): void {
        this._isMounted = false;
    }

    async refresh(p_showLoading = true): Promise<void> {
        if (this._isMounted && p_showLoading) {
            this.setState({ isLoading: true });
        } else if (this._isMounted) {
            this.setState({ isRefreshing: true });
        }

        this._currentScrollPosition = 0;
        this._lastPostHashHex = '';
        this._noMoreData = false;

        await cache.exchangeRate.getData();
        await this.loadPosts(false);
    }

    private async loadPosts(p_loadMore: boolean) {

        if (this.state.isLoadingMore || this._noMoreData) {
            return;
        }

        if (this._isMounted) {
            this.setState({ isLoadingMore: p_loadMore });
        }

        try {
            const numToFetch = 10;
            const response: string[] = await deSocialApi.getNewbiesFeed(numToFetch, this._lastPostHashHex, globals.user.publicKey);

            this._noMoreData = response.length < numToFetch;

            if (response.length > 0) {
                this._lastPostHashHex = response[response.length - 1];
            }

            await this.fetchPosts(response, p_loadMore);

        } catch (error) {
            globals.defaultHandleError(error);
        } finally {
            if (this._isMounted) {
                this.setState({ isLoadingMore: false, isLoading: false, isRefreshing: false });
            }
        }
    }

    async fetchPosts(postHashHexes: string[], p_loadMore: boolean): Promise<void> {
        let allPosts: Post[] = [];
        const promises: Promise<Post | undefined>[] = [];

        for (const postHashHex of postHashHexes) {
            const promise = new Promise<Post | undefined>(
                (p_resolve) => {
                    api.getSinglePost(globals.user.publicKey, postHashHex, false, 0, 0).then(
                        response => {
                            p_resolve(response.PostFound);
                        }
                    ).catch(() => p_resolve(undefined));
                }
            );
            promises.push(promise);
        }

        const posts = await Promise.all(promises);
        const filteredPosts: Post[] = posts.filter(post => post != null) as Post[];

        const processedPosts = await this.processPosts(filteredPosts);

        if (p_loadMore) {
            allPosts = this.state.posts.concat(processedPosts);
        } else {
            allPosts = processedPosts;
        }

        if (this._isMounted) {
            this.setState({ posts: allPosts });
        }
    }

    private async processPosts(p_posts: Post[]): Promise<Post[]> {
        let posts: Post[] = [];

        if (posts) {
            const user = await cache.user.getData();
            const blockedUsers = user?.BlockedPubKeys ? user.BlockedPubKeys : [];
            posts = p_posts.filter(
                p_post => !!p_post.ProfileEntryResponse &&
                    !p_post.IsHidden &&
                    !blockedUsers[p_post.ProfileEntryResponse.PublicKeyBase58Check] &&
                    !blockedUsers[p_post.RepostedPostEntryResponse?.ProfileEntryResponse?.PublicKeyBase58Check]
            );
        }
        return posts;
    }

    private goToDeSocial() {
        Linking.openURL('https://desocialworld.com');
    }

    render(): JSX.Element {
        if (this.state.isLoading) {
            return <CloutFeedLoader />;
        }

        const keyExtractor = (item: Post, index: number) => item.PostHashHex + String(index);
        const renderItem = (item: Post) => {
            return <PostComponent
                route={this.props.route}
                navigation={this.props.navigation}
                post={item} />;
        };
        const renderFooter = this.state.isLoadingMore && !this.state.isLoading
            ? <ActivityIndicator color={themeStyles.fontColorMain.color} />
            : undefined;

        const refreshControl = <RefreshControl
            tintColor={themeStyles.fontColorMain.color}
            titleColor={themeStyles.fontColorMain.color}
            refreshing={this.state.isRefreshing}
            onRefresh={() => this.refresh(false)} />;

        const renderHeader = <View style={[styles.header, themeStyles.containerColorMain]}>
            <Image
                style={styles.deSocialLogo}
                source={require('../../../../assets/desocial.png')}
            ></Image>
            <View style={styles.headerLinkWrapper}>
                <Text style={[styles.headerLink, themeStyles.linkColor]} onPress={() => this.goToDeSocial()}>Powered by DeSocialWorld</Text>
            </View>
        </View>;

        return (
            <>
                <View style={{ flex: 1 }}>
                    <FlatList
                        ref={this._flatListRef}
                        onMomentumScrollEnd={
                            (p_event: NativeSyntheticEvent<NativeScrollEvent>) => this._currentScrollPosition = p_event.nativeEvent.contentOffset.y
                        }
                        data={this.state.posts}
                        showsVerticalScrollIndicator={false}
                        keyExtractor={keyExtractor}
                        renderItem={({ item }) => renderItem(item)}
                        onEndReached={() => this.loadPosts(true)}
                        stickyHeaderIndices={[0]}
                        initialNumToRender={3}
                        onEndReachedThreshold={3}
                        maxToRenderPerBatch={5}
                        windowSize={8}
                        refreshControl={refreshControl}
                        ListHeaderComponent={renderHeader}
                        ListFooterComponent={renderFooter}
                    />
                </View>
            </>
        );
    }
}

const styles = StyleSheet.create(
    {
        header: {
            paddingTop: 2,
            paddingLeft: 10,
            flexDirection: 'row',
            alignItems: 'center'
        },
        headerLinkWrapper: {
            marginBottom: 4
        },
        headerLink: {
            fontWeight: '600'
        },
        deSocialLogo: {
            height: 32,
            width: 32,
            marginRight: 0,
            borderRadius: 4
        }
    }
);
