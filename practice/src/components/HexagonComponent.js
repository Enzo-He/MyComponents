import React from 'react'
import { Col } from "react-bootstrap";
/* https://icons8.com/icons/set/helm */
import './Hexagon.css'



const HexagonComponent = ({ category, idx }) => {
  const images = [
    "/images/products/ppe.png",
    "/images/products/drill.png",
    "/images/products/electrical.png",
    "/images/products/hose.png",
    "/images/products/mechamical.png",
  ];

  const imagesW = [
    "/images/products/ppeW.png",
    "/images/products/drillW.png",
    "/images/products/electricalW.png",
    "/images/products/hoseW.png",
    "/images/products/mechamicalW.png",
  ];

  return (
    <Col>
            <div className='box'>
        <div class="box1">
          <div class="box2">
            <div class="box3">
              <img className='img_N' src={images[idx]} alt="" />
              <img className='img_W' src={imagesW[idx]} alt="" />
              <p className='hexagon_cat'>{category}</p>
            </div>
          </div>
        </div>
      </div>

{/*       <div className='hexagon hex'>
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