import { SUPABASE_URL, SUPABASE_ANON_KEY, todayStr } from './config.js';
import { drawLeaderBoard } from './ui.js';

export const supabaseclient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function getLeaderboard() {
  const { data, error } = await supabaseclient
    .from('leaderboard')
    .select('*')
    .order('score', { ascending: true })
    .order('time', { ascending: true })
    .eq('day', todayStr)
    .limit(5);
  if (error) console.error(error);
  return data;
}

export async function getDailyLevelId() {
  const { data, error } = await supabaseclient
    .from('daily_level')
    .select('level_id')
    .eq('day', todayStr)
    .single();
  if (error) console.error(error);
  return data;
}

export async function getDailyLevel(id) {
  const { data, error } = await supabaseclient
    .from('level')
    .select('*')
    .eq('id', id)
    .single();
  if (error) console.error(error);
  return data;
}

export async function submitScore(player_name, time, score, day, timestamp){
  try{
    if(score <= 0 || time <= 0){
      alert('Invalid score or time. Please play the game first.');
      return;
    }
    
    const { data, error } = await supabaseclient
    .from('leaderboard')
    .insert([{ player_name, time, score, day, timestamp }]);

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
