// supabase.js
import { SUPABASE_URL, SUPABASE_ANON_KEY, todayStr } from './config.js';
import { drawLeaderBoard } from './ui.js';

export const supabaseclient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function getLeaderboard() {
  const level = todayStr;
    const { data, error } = await supabaseclient
        .from('leaderboard')
        .select('*')
        .order('score', { ascending: true })
        .order('time', { ascending: true })
        .eq('level', level)
        .limit(5);
    if (error) console.error(error);
    return data;
}

export async function submitScore(player_name, time, score, level, timestamp){
    try{

      if(score <= 0 || time <= 0){
        alert('Invalid score or time. Please play the game first.');
        return;
      }
      
      const { data, error } = await supabaseclient
      .from('leaderboard')
      .insert([{ player_name, time, score, level, timestamp }]);

      if (error) {
        console.error('Error submitting score:', error.message);
        alert('Failed to submit score. Try again.');
        return;
      }

      drawLeaderBoard();

    }catch(e){
      updateStatusText('Failed to submit score. Playing locally?');
     }
  }
