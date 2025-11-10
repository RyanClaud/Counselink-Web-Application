document.addEventListener('DOMContentLoaded', () => {
  const jumpingTextElement = document.getElementById('jumping-text');
  if (!jumpingTextElement) {
    return;
  }

  const topics = [
    'ADHD',
    'Anger',
    'Anxiety',
    'Bipolar Disorder',
    'CBT',
    'Depression',
    'EMDR',
    'Grief/Loss',
    'Relationships',
    'Self Esteem',
    'Stress',
    'Trauma/PTSD',
  ];

  // Create the HTML for all topics, wrapping each word and letter in spans.
  let html = '';
  topics.forEach(topic => {
    const letters = topic.split('').map((letter, i) => 
      `<span class="jump-letter" style="--i:${i}">${letter === ' ' ? '&nbsp;' : letter}</span>`
    ).join('');
    html += `<span class="topic-word">${letters}</span>`;
  });
  jumpingTextElement.innerHTML = html;

  const wordElements = document.querySelectorAll('.topic-word');
  let currentWordIndex = 0;

  function animateWords() {
    // Remove active class from all words
    wordElements.forEach(word => word.classList.remove('active-word'));

    // Get the current word and add the active class
    const currentWord = wordElements[currentWordIndex];
    currentWord.classList.add('active-word');

    // Move to the next word for the next cycle
    currentWordIndex = (currentWordIndex + 1) % wordElements.length;
  }

  // Start the animation loop.
  // The interval should be slightly longer than the CSS animation duration
  // to allow one word's animation to finish before the next starts.
  // (1.8s animation + 0.5s buffer = 2.3s)
  animateWords(); // Animate the first word immediately
  setInterval(animateWords, 2300);
});