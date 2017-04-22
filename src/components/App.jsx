import React from 'react';
import '../stylesheet.sass';
import Card from './Card.jsx';
import reqwest from 'reqwest';
import { HorizontalBar } from 'react-chartjs-2';
import async from 'async';

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      keyword: '',
      tonesList: null,
      loading: false,
      posts: null,
    };

    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSearchClick = this.handleSearchClick.bind(this);
  }

  handleInputChange({ target }) {
    this.setState({ keyword: target.value });
  }

  handleSearchClick() {
    this.setState({
      tonesList: null,
      loading: false,
      posts: [],
    });
    async.waterfall([
      (cb) => {
        reqwest({
          url: `http://localhost:8000/?q=${this.state.keyword}`,
          type: 'json',
          error: cb,
          success: cb.bind(this, null),
        });
      },
      (statuses, cb) => {
        const text = statuses.reduce((text, status) => text + ' ' + status.text, '');
        async.parallel([
          (cb) => {
            reqwest({
              method: 'post',
              url: 'http://localhost:8000/',
              type: 'json',
              data: { text },
              error: cb,
              success: (body) => {
                const { tone_categories } = body;
                const tonesList = {};
                tone_categories.forEach(({ tones, category_name }) => {
                  tonesList[category_name] = {
                    labels: [],
                    datasets: [{
                      label: category_name,
                      backgroundColor: '#30CCB6',
                      data: [],
                    }],
                  };
                  tones.forEach(({ score, tone_name }) => {
                    tonesList[category_name].labels.push(tone_name);
                    tonesList[category_name].datasets[0].data.push(score);
                  });
                });
                this.setState({ tonesList });
                cb();
              },
            });
          },
          ...statuses.map(({ user: { screen_name }, id_str }) => (cb) => {
            reqwest({
              url: `https://publish.twitter.com/oembed?url=https%3A%2F%2Ftwitter.com%2F${screen_name}%2Fstatus%2F${id_str}`,
              type: 'jsonp',
              error: cb,
              success: ({ html }) => {
                this.setState((state) => ({
                  posts: [
                    ...state.posts,
                    <Card key={id_str}>
                      <div dangerouslySetInnerHTML={{ __html: html }} />
                    </Card>,
                  ]
                }));
                cb();
              }
            });
          })
        ], cb);
      },
    ], (err) => {
      this.setState({ loading: false });
    });
  }

  render() {
    const { tonesList, loading, posts } = this.state;
    return (
      <div className="card-container">
        <Card>
          <div className="search-container">
            <input type="text" defaultValue={this.state.keyword} onChange={this.handleInputChange} />
            <i className="fa fa-search" aria-hidden="true" onClick={this.handleSearchClick} />
          </div>
        </Card>
        {
          loading &&
          <Card>
            <div className="loading-container">
              <i className="fa fa-spinner fa-spin" aria-hidden="true" />
              <span>&nbsp;Loading...</span>
            </div>
          </Card>
        }
        {
          tonesList &&
          Object.keys(tonesList).map((category_name, i) => (
            <Card key={i}>
              <HorizontalBar data={tonesList[category_name]} />
            </Card>
          ))
        }
        {
          this.state.posts
        }
      </div>
    );
  }
}

export default App;