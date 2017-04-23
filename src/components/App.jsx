import React from 'react';
import '../stylesheet.sass';
import Card from './Card.jsx';
import reqwest from 'reqwest';
import { HorizontalBar, defaults } from 'react-chartjs-2';
import async from 'async';
import extend from 'extend';
import moment from 'moment';
import Highlighter from 'react-highlight-words';

defaults.global.legend.display = false;

const shuffle = (array) => {
  const randomized = [];
  for (let i = array.length - 1; i >= 0; i--) {
    randomized.push(...array.splice(Math.random() * i | 0, 1));
  }
  return randomized;
};

class App extends React.Component {
  constructor(props) {
    super(props);

    this.initialState = {
      keyword: '',
      progress: {
        current: 0,
        total: 1
      },
      data: [],
      selected: null,
    };

    this.state = { ...this.initialState };

    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSearchClick = this.handleSearchClick.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.handleClearClick = this.handleClearClick.bind(this);
  }

  resetProgress(total = 0) {
    document.getElementById('progress').style.width = total ? '0%' : '100%';
    document.getElementById('progress').style.opacity = total ? '1' : '0';
    this.setState({ progress: { current: 0, total } });
  }

  progress() {
    this.setState((state) => {
      const progress = { ...state.progress };
      progress.current++;
      const percent = progress.current / progress.total;
      document.getElementById('progress').style.width = `${percent * 100}%`;
      return { progress };
    });
  }

  handleInputChange({ target }) {
    this.setState({ keyword: target.value });
  }

  handleKeyPress({ key }) {
    if (key === 'Enter') {
      this.handleSearchClick();
    }
  }

  handleSearchClick() {
    if (this.state.data.length > 5) return;
    const { keyword } = this.state;
    let hue = null;
    const hues = this.state.data.map(({ hue }) => hue);
    do {
      hue = Math.random() * 360;
    } while (hues.some(v => Math.abs(hue - v) < 30));
    const color = `hsl(${hue}, 50%, 50%)`;
    this.setState((state) => ({
      keyword: '',
      data: [...state.data, {
        keyword,
        hue,
        color,
        chart: {},
        posts: [],
        keywords: [],
      }],
      selected: null,
    }));
    this.resetProgress(5);
    this.progress();
    async.waterfall([
      (cb) => {
        reqwest({
          url: `http://localhost:8000/?q=${keyword}`,
          type: 'json',
          error: cb,
          success: cb.bind(this, null),
        });
      },
      ({ twitter, reddit }, cb) => {
        this.progress();
        const text =
          twitter.reduce((text, post) => text + ' ' + post.text, '')
          + '' +
          reddit.reduce((text, post) => text + ' ' + post.title, '');
        async.parallel([
          (cb) => {
            reqwest({
              method: 'post',
              url: 'http://localhost:8000/tone',
              type: 'json',
              data: { text },
              error: cb,
              success: ({ tone_categories }) => {
                this.setState((state) => {
                  const data = [...state.data];
                  const index = data.findIndex(o => o.keyword === keyword);
                  if (!~index) return {};
                  const datum = extend(true, {}, data[index]);
                  data[index] = datum;
                  tone_categories.forEach(({ tones, category_name }) => {
                    datum.chart[category_name] = {
                      labels: tones.map(({ tone_name }) => tone_name),
                      data: tones.map(({ score }) => score),
                    };
                  });
                  return { data };
                });
                this.progress();
                cb();
              },
            });
          },
          (cb) => {
            this.setState((state) => {
              const data = [...state.data];
              const index = data.findIndex(o => o.keyword === keyword);
              if (!~index) return {};
              const datum = extend(true, {}, data[index]);
              data[index] = datum;
              datum.posts.push(...twitter.map((post) => ({ type: 'twitter', post })));
              datum.posts.push(...reddit.map((post) => ({ type: 'reddit', post })));
              datum.posts = shuffle(datum.posts);
              return { data };
            });
            this.progress();
            cb();
          },
          (cb) => {
            reqwest({
              method: 'post',
              url: 'http://localhost:8000/keyword',
              type: 'json',
              data: { text },
              error: cb,
              success: ({ keywords }) => {
                this.setState((state) => {
                  const data = [...state.data];
                  const index = data.findIndex(o => o.keyword === keyword);
                  if (!~index) return {};
                  const datum = extend(true, {}, data[index]);
                  data[index] = datum;
                  datum.keywords = keywords;
                  return { data };
                });
                this.progress();
                cb();
              },
            });
          }
        ], cb);
      },
    ], (err) => {
      this.resetProgress();
    });
  }

  handleClearClick() {
    this.setState({ data: [], selected: null });
  }

  remove(i) {
    const data = [...this.state.data];
    data.splice(i, 1);
    this.setState({ data, selected: null });
  }

  filter(selected) {
    if (selected === this.state.selected) selected = null;
    this.setState({ selected });
  }

  download(filename) {
    if (this.state.data.every(({ chart }) => Object.keys(chart).length)) {
      let element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(this.generateCSV()));
      element.setAttribute('download', filename);

      element.style.display = 'none';
      document.body.appendChild(element);

      element.click();

      document.body.removeChild(element);
    }
  }

  generateCSV() {
    const { data } = this.state;
    let csv_data = '';
    const num_data = data.length;
    Object.keys(data[0].chart).forEach((category_name) => {
      csv_data += ',' + data[0].chart[category_name].labels.join(',');
    });
    csv_data += '\n';
    for (let i = 0; i < num_data; i++) {
      csv_data += data[i].keyword;
      Object.keys(data[i].chart).forEach((category_name) => {
        csv_data += ',' + data[i].chart[category_name].data.join(',');
      });
      csv_data += '\n';
    }
    return csv_data;
  }

  render() {
    const { data, selected } = this.state;
    const posts = [];
    data.forEach((datum) => {
      posts.push(...datum.posts.map(({ type, post }, i) => {
        const twitter = type === 'twitter';
        const text = twitter ? post.text : post.title;
        if (selected && !new RegExp(`\\b${selected}\\b`, 'im').test(text)) return;
        return (
          <a href={twitter ?
            `https://twitter.com/${post.user.screen_name}/status/${post.id_str}` :
            `https://www.reddit.com${post.permalink}`}
             className='reddit-card-wrapper' target='_blank' key={`${post.id}-${i}`}>
            <Card>
              <div className='reddit-container'>
                <div className='reddit-header'>
                  <span className='author'>{twitter ? post.user.screen_name : post.author}</span>
                  <span className='points'>
                    {twitter ? `${post.retweet_count} retweets` : `${post.score} points`}
                    &nbsp;·&nbsp;
                    {moment(twitter ? post.created_at : (post.created * 1000)).fromNow()}</span>
                </div>
                <Highlighter
                  highlightClassName='highlight'
                  searchWords={[selected]}
                  textToHighlight={text} />
                <div className='reddit-footer'>
                  <span className='subreddit'>{post.subreddit_name_prefixed}</span>
                  <div className={`logo ${type}`} />
                </div>
              </div>
            </Card>
          </a>
        )
      }));
    });

    return (
      <div className='card-container'>
        <Card>
          <div className='search-container'>
            <div className='logo' />
            <input type='text' value={this.state.keyword} onChange={this.handleInputChange}
                   onKeyPress={this.handleKeyPress} />
            <i className='fa fa-search' aria-hidden='true' onClick={this.handleSearchClick} />
          </div>
        </Card>
        <div className='keyword-list'>
          {
            data.length ?
              <Card onClick={() => this.download('data.csv')}>
                <div className='csv-container'>
                  CSV
                </div>
              </Card> :
              null
          }
          {
            data.length ?
              <Card onClick={this.handleClearClick}>
                <div>
                  Clear
                </div>
              </Card> :
              null
          }
          {
            data.map(({ keyword, color }, i) => (
              <Card key={`keyword-${i}`} color={color} white>
                <div>
                  {keyword}
                </div>
                <i className='fa fa-times' aria-hidden='true' onClick={() => this.remove(i)} />
              </Card>
            ))
          }
        </div>
        {
          data.length && data[0].keywords.length ?
            <Card>
              <div className='keyword-container'>
                {
                  data.map(({ keyword, color, keywords }, i) =>
                    keywords.map((keyword, i) => {
                      const hasColor = !selected || keyword === selected;
                      return (
                        <Card key={`${keyword}-${i}`}
                              color={hasColor && color} white={hasColor}
                              onClick={() => this.filter(keyword)}>
                          {keyword}
                        </Card>
                      )
                    })
                  )
                }
              </div>
            </Card> :
            null
        }
        {
          !selected && data.length ?
            Object.keys(data[0].chart)
              .map((category_name, i) => (
                  <Card key={`chart-${i}`} vertical>
                    <h2>{category_name}</h2>
                    <div className='chart-wrapper'>
                      {
                        <HorizontalBar data={{
                          labels: data[0].chart[category_name].labels,
                          datasets: data
                            .filter(({ chart }) => Object.keys(chart).length)
                            .map(({ keyword, chart, color }) => ({
                              label: keyword,
                              backgroundColor: color,
                              data: chart[category_name].data
                            }))
                        }} options={{
                          scales: {
                            xAxes: [{
                              ticks: {
                                beginAtZero: true,
                                steps: 10,
                                stepValue: .1,
                                max: 1,
                              }
                            }]
                          }
                        }} />
                      }
                    </div>
                  </ Card >
                )
              ) :
            null
        }
        {
          posts.reverse()
        }
      </div>
    );
  }
}

export default App;