import React, { PureComponent, Fragment } from "react";
import throttle from "lodash/throttle";
import { injectState } from "freactal";
import { pick } from "ramda";
import { Thing } from "./Thing";

const LISTING_PROPS = [
  "days",
  "topics",
  "replyToId",
  "domain",
  "url",
  "sort",
  "limit",
  "count",
  "threshold"
];

class ListingBase extends PureComponent {
  constructor(props) {
    super(props);
    const ids = this.props.state.notabugApi.getListingIds(this.getListingParams());
    this.state = { ids };
    this.onUpdate = this.onUpdate.bind(this);
    this.onRefresh = throttle(() => this.onUpdate(), 150);
    props.state.notabugApi.onChange(null, this.onRefresh);
  }

  componentDidMount() {
    const ids = this.props.state.notabugApi.getListingIds(this.getListingParams());
    this.setState({ ids }, this.onRefresh);
    this.onSubscribe();
  }

  componentWillReceiveProps(nextProps) {
    this.onUnsubscribe(this.props);
    this.onSubscribe(nextProps);
  }

  componentWillUnmount() {
    this.props.state.notabugApi.onChangeOff(null, this.onRefresh);
  }

  render() {
    const { ids} = this.state;
    const { myContent = {}, Empty, Container=Fragment, containerProps={} } = this.props;
    const count = parseInt(this.props.count, 10) || 0;
    if (!this.state.ids.length && Empty) return <Empty />;

    return (
      <Container {...containerProps} >
        {ids.map((id, idx) =>(
          <Thing
            Loading={this.props.Loading}
            disableChildren={this.props.disableChildren}
            id={id}
            key={id}
            isMine={!!myContent[id]}
            rank={this.props.noRank ? null : count + idx + 1}
            onDidUpdate={this.props.onDidUpdate}
            collapseThreshold={this.props.collapseThreshold}
          />
        ))}
      </Container>
    );
  }

  getListingParams(props) {
    return pick(
      LISTING_PROPS,
      props || this.props
    );
  }

  onSubscribe(props) {
    const { notabugApi } = (props || this.props).state;
    const { effects, realtime } = (props || this.props);
    const params = this.getListingParams();
    effects.onNotabugPreloadListing(params)
      .catch(error => console.warn("Error preloading listing", error))
      .then(() => this.onUpdate())
      .then(() => (this.state.ids && this.state.ids.length)
        ? realtime && setTimeout(() => notabugApi.watchListing(params), 1000)
        : notabugApi.watchListing(params));
    //(props || this.props).state.notabugApi.onChangeListing(this.getListingParams(), this.onRefresh);
  }

  onUnsubscribe() {
    //(props || this.props).state.notabugApi.onChangeListingOff(this.getListingParams(), this.onRefresh);
  }

  onUpdate(props) {
    const { onDidUpdate } = this.props;
    const ids = (props || this.props).state.notabugApi
      .getListingIds(this.getListingParams(props));
    if (ids.join("|") !== this.state.ids.join("|")) {
      this.setState({ ids }, onDidUpdate);
    }
  }
}

export const Listing = injectState(ListingBase);
