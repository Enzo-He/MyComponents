import React from 'react'
import { Card, Col, Container } from "react-bootstrap";
/* https://icons8.com/icons/set/helm */
import './Hexagon.css'



const HexagonComponent = ({ category, idx }) => {
  const images = [
    "/images/products/PPE.jpg",
    "/images/products/POWERTOOLS.jpg",
    "/images/products/SITESAFETY.jpg",
    "/images/products/ELECTRICAL.jpg",
    "/images/products/MECHANICAL.jpg",
    "/images/products/HYDRATION.jpg",
    "/images/products/SURPLUSSTOCK.jpg",
  ];
  return (
    <Col>
    <div className='box'>
      <div class="box1">
        <div class="box2">
          <div class="box3">
            <img src="/images/products/PPE.png" alt="" />
            <span className='hexagon_cat'>{category}</span>
          </div>
        </div>
      </div>
</div>

      {/*     <div className='hexagon hex'>
      <img
        src={images[idx]}
        alt="First slide"
        className='hexagon_img'
      />
      <p>{category}</p>
    </div> */}
    </Col>
  )
}


export default HexagonComponent