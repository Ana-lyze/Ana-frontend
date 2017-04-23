import React from 'react';
import '../stylesheet.sass';
import Card from './Card.jsx';
import reqwest from 'reqwest';
import { HorizontalBar, defaults } from 'react-chartjs-2';
import async from 'async';
import extend from 'extend';

defaults.global.legend.display = false;

class App extends React.Component {
  constructor(props) {
    super(props);

    this.initialState = {
      keyword: '',
      loading: false,
      data: []
    };

    this.state = { ...this.initialState };

    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSearchClick = this.handleSearchClick.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.handleClearClick = this.handleClearClick.bind(this);
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
      data: [...state.data, {
        keyword,
        hue,
        color,
        chart: {},
        posts: [],
      }],
      loading: true,
    }));
    async.waterfall([
      (cb) => {
        reqwest({
          url: `http://localhost:8000/?q=${keyword}`,
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
                this.setState((state) => {
                  const data = [...state.data];
                  const index = data.findIndex(o => o.keyword === keyword);
                  if (!~index) return {};
                  const datum = extend(true, {}, data[index]);
                  data[index] = datum;
                  datum.posts.push({ html, id_str });
                  return { data };
                });
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

  handleClearClick() {
    this.setState({ data: [] });
  }

  remove(i) {
    const data = [...this.state.data];
    data.splice(i, 1);
    this.setState({ data });
  }

  download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  }

  render() {
    const { loading, data } = this.state;
    const posts = [];
    data.forEach((datum) => {
      posts.push(...datum.posts.map(({ html, id_str }) => (
        <Card key={id_str}>
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </Card>
      )));
    });
    return (
      <div className="card-container">
        <Card>
          <div className="search-container">
            <input type="text" defaultValue={this.state.keyword} onChange={this.handleInputChange}
                   onKeyPress={this.handleKeyPress} />
            <i className="fa fa-search" aria-hidden="true" onClick={this.handleSearchClick} />
          </div>
        </Card>
        <div className="keyword-list">
          {
            data.length ?
              <Card>
                <div onClick={this.handleClearClick} className="clear-container">
                  Clear
                </div>
              </Card> :
              null
          }
          {
            data.map(({ keyword, color }, i) => (
              <Card key={`keyword-${i}`} color={color} white>
                <div>{keyword}</div>
                <i className="fa fa-times" aria-hidden="true" onClick={() => this.remove(i)} />
              </Card>
            ))
          }
        </div>
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
          data.length ?
            Object.keys(data[0].chart)
              .map((category_name, i) => (
                <Card key={`chart-${i}`} vertical>
                  <h2>{category_name}</h2>
                  <div className="chart-wrapper">
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
                      }} />
                    }
                  </div>
                </Card>
              )) :
            null
        }
        <Card>
          <div className="csv-container">
            <a onClick={() => this.download("data.csv", "1, 2, 3")}>data.csv</a>
          </div>
        </Card>
        {
          posts.reverse()
        }
      </div>
    );
  }
}

export default App;