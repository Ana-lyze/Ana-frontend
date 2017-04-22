import React from 'react';
import '../stylesheet.sass';
import Card from './Card.jsx';
import request from 'browser-request';
import { BarChart } from 'react-easy-chart';

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      keyword: '',
      tonesList: null,
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
        tonesList[category_name] = [];
        tones.forEach(({ score, tone_name }) => {
          tonesList[category_name].push({ name: tone_name, value: score });
        });
      });
      this.setState({ tonesList });
    });
  }

  render() {
    const { tonesList } = this.state;
    console.log(tonesList);
    return (
      <div className="card-container">
        <Card>
          <div className="search-container">
            <input type="text" defaultValue={this.state.keyword} onChange={this.handleInputChange} />
            <i className="fa fa-search" aria-hidden="true" onClick={this.handleSearchClick} />
          </div>
        </Card>
        {
          tonesList && Object.keys(tonesList).map((category_name, i) => (
            <Card key={i}>
              <BarChart
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