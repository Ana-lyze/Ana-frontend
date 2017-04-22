import React from 'react';

class Card extends React.Component {
  render() {
    return (
      <div className="card-wrapper">
        <div className="card">
          {this.props.children}
        </div>
      </div>
    );
  }
}

export default Card;