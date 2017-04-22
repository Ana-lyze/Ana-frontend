import React from 'react';
import '../stylesheet.sass';
import Card from './Card.jsx';
import request from 'browser-request';
import { HorizontalBar } from 'react-chartjs-2';

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      keyword: '',
      tonesList: null,
      loading: false,
    };

    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSearchClick = this.handleSearchClick.bind(this);
  }

  handleInputChange({ target }) {
    this.setState({
      keyword: target.value,
      result: null,
    });
  }

  handleSearchClick() {
    request({
      url: `http://localhost:8000/?q=${this.state.keyword}`,
      json: true,
    }, (err, res, { tone_categories }) => {
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
    });
  }

  render() {
    const { tonesList } = this.state;
    return (
      <div className="card-container">
        <Card>
          <div className="search-container">
            <input type="text" defaultValue={this.state.keyword} onChange={this.handleInputChange} />
            <i className="fa fa-search" aria-hidden="true" onClick={this.handleSearchClick} />
          </div>
        </Card>
        <Card>
          <div className="loading-container">
            <i className="fa fa-spinner fa-spin" aria-hidden="true" />
            <span>Loading...</span>
          </div>
        </Card>
        {
          tonesList && Object.keys(tonesList).map((category_name, i) => (
            <Card key={i}>
              <HorizontalBar
                data={tonesList[category_name]}
              />
            </Card>
          ))
        }
      </div>
    );
  }
}

export default App;