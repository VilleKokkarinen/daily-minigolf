import { muted } from "./game.js";

const hit_audio = new Audio('hit.mp3');
const illegal_audio = new Audio('illegal.mp3');

export const playAudio = (name) => {
    if(muted) return;
    
    if (name === 'hit') {
        hit_audio.currentTime = 0;
        hit_audio.play();
    } else if (name === 'illegal') {
        illegal_audio.currentTime = 0;
        illegal_audio.play();
    }
}