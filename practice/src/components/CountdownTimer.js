import "./CountdownTimer.css";
import React, { useState, useEffect } from "react";
import { CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
/* npm i react-circular-progressbar */

const CountdownTimer = () => {
    const [timerDays, setTimerDays] = useState();
    const [timerHours, setTimerHours] = useState();
    const [timerMinutes, setTimerMinutes] = useState();
    const [timerSeconds, setTimerSeconds] = useState();
  
    let interval;
  
    const startTimer = () => {
      const countDownDate = new Date("Jan 18,2023 12:00:00 GMT+08:00").getTime();
  
      interval = setInterval(() => {
        const now = new Date().getTime();
  
        const distance = countDownDate - now;
  
        const days = Math.floor(distance / (24 * 60 * 60 * 1000));
        const hours = Math.floor(
          (distance % (24 * 60 * 60 * 1000)) / (1000 * 60 * 60)
        );
        const minutes = Math.floor((distance % (60 * 60 * 1000)) / (1000 * 60));
        const seconds = Math.floor((distance % (60 * 1000)) / 1000);
  
        if (distance < 0) {
          // Stop Timer
  
          clearInterval(interval.current);
        } else {
          // Update Timer
          setTimerDays(days);
          setTimerHours(hours);
          setTimerMinutes(minutes);
          setTimerSeconds(seconds);
        }
      });
    };
  
    useEffect(() => {
      startTimer();
    });
  
    /* CircularProgressbar */
    const percentageDays = Math.round(timerDays / 77*100);
    const percentageHours = Math.round(timerHours / 24 * 100);
    const percentageMinutes = Math.round(timerMinutes / 60 * 100);
    const percentageSeconds = Math.round(timerSeconds / 60 * 100);
  return (
    <div className="CountDown">
    <div className="days">
      <CircularProgressbar
        value={percentageDays}
        text={`${timerDays}`} />
      Days</div>
    <div className="hours">
      <CircularProgressbar
      value={percentageHours}
      text={`${timerHours}`} />
      Hours</div>
    <div className="minutes">
      <CircularProgressbar
      value={percentageMinutes}
      text={`${timerMinutes}`} />
      Minutes</div>
    <div className="seconds">
      <CircularProgressbar
      value={percentageSeconds}
      text={`${timerSeconds}`} />
      Seconds</div>
  </div>
  )
}

export default CountdownTimer