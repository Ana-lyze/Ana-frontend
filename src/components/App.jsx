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
      tonesList: {},
      loading: false,
      posts: null,
    };
    this.csv_data = undefined;

    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSearchClick = this.handleSearchClick.bind(this);
  }

  handleInputChange({ target }) {
    this.setState({ keyword: target.value });
  }

  handleSearchClick() {
    const { keyword } = this.state;
    const color = `hsl(${Math.random() * 360}, 50%, 50%)`;
    this.setState({
      loading: false,
      posts: [],
    });
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
              success: (body) => {
                const { tone_categories } = body;
                const tonesList = { ...this.state.tonesList };
                tone_categories.forEach(({ tones, category_name }) => {
                  if (!tonesList[category_name]) {
                    tonesList[category_name] = {
                      labels: [],
                      datasets: [],
                    };
                    tones.forEach(({ tone_name }) => {
                      tonesList[category_name].labels.push(tone_name);
                    });
                  }
                  const dataset = {
                    label: keyword,
                    backgroundColor: color,
                    data: [],
                  };
                  tones.forEach(({ score }) => {
                    dataset.data.push(score);
                  });
                  tonesList[category_name].datasets.push(dataset);
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

  download(filename, text) {
    let element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  }

  generateCSV() {
    const {tonesList} = this.state;
    let csv_data = "";
    let num_data = tonesList[Object.keys(tonesList)[0]].datasets.length;
    for(let i = 0; i < num_data; i++) {
      csv_data += tonesList[Object.keys(tonesList)[0]].datasets[i].label;

      for(let j = 0; j < tonesList[Object.keys(tonesList)[0]].datasets[i].data.length; j++) {
        csv_data += ", "+tonesList[Object.keys(tonesList)[0]].labels[j]+", "+tonesList[Object.keys(tonesList)[0]].datasets[i].data[j];
      }for(let j = 0; j < tonesList[Object.keys(tonesList)[1]].datasets[i].data.length; j++) {
        csv_data += ", "+tonesList[Object.keys(tonesList)[1]].labels[j]+", "+tonesList[Object.keys(tonesList)[1]].datasets[i].data[j];
      }for(let j = 0; j < tonesList[Object.keys(tonesList)[2]].datasets[i].data.length; j++) {
        csv_data += ", "+tonesList[Object.keys(tonesList)[2]].labels[j]+", "+tonesList[Object.keys(tonesList)[2]].datasets[i].data[j];
      }

      if(i != num_data-1) csv_data += ", \n";
    }
    return csv_data;
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
            <Card key={i} vertical>
              <h2>{category_name}</h2>
              <div className="chart-wrapper">
                <HorizontalBar data={tonesList[category_name]} />
              </div>
            </Card>
          ))
        }
        {
          Object.keys(this.state.tonesList).length==0||
          <Card>
            <div className="csv-container">
              <a onClick={() => this.download("data.csv", this.generateCSV())}>CSV</a>
            </div>
          </Card>
        }
        {
          this.state.posts
        }
      </div>
    );
  }
}

export default App;