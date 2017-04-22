import React from 'react';
import '../stylesheet.sass';
import Card from './Card.jsx';
import request from 'browser-request';
import { HorizontalBar } from 'react-chartjs-2';

class App extends React.Component {

  constructor(props) {
    super(props);
    this.queue = [];
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
      //console.log(tonesList);
      this.queue = [];
      tonesList && Object.keys(tonesList).forEach((category_name, i) => (
          this.queue.unshift(<Card key={this.queue.length}><h4>{this.state.keyword}</h4><HorizontalBar data = {tonesList[category_name]}/></Card>)
      ));
      this.setState({ tonesList });


    });


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
    console.log(this.queue);
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
            this.queue
          }
        <Card>
          <div className="csv-container">
            <a onClick={() => this.download("data.csv","1, 2, 3")}>data.csv</a>
          </div>
        </Card>
      </div>
    );
  }
}

export default App;