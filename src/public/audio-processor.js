// AudioWorklet processor for advanced audio processing
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 128;
    this.buffer = new Float32Array(this.bufferSize);
    this.ptr = 0;
    
    // Echo cancellation parameters
    this.delayBuffer = new Float32Array(2048); // ~46ms at 44.1kHz
    this.delayPtr = 0;
    this.feedback = 0.1; // Reduced feedback for echo cancellation
    this.wetDry = 0.2;   // Mostly dry signal
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    if (input.length > 0 && output.length > 0) {
      const inputChannel = input[0];
      const outputChannel = output[0];
      
      for (let i = 0; i < inputChannel.length; i++) {
        // Simple echo reduction algorithm
        const inputSample = inputChannel[i];
        
        // Get delayed sample (simulate acoustic echo)
        const delayedIndex = (this.delayPtr - 512 + this.delayBuffer.length) % this.delayBuffer.length;
        const delayedSample = this.delayBuffer[delayedIndex];
        
        // Subtract delayed signal from input (echo cancellation)
        const processedSample = inputSample - (delayedSample * this.feedback);
        
        // Store current sample in delay buffer
        this.delayBuffer[this.delayPtr] = processedSample;
        this.delayPtr = (this.delayPtr + 1) % this.delayBuffer.length;
        
        // Mix dry and wet signal
        outputChannel[i] = (processedSample * (1 - this.wetDry)) + (delayedSample * this.wetDry);
        
        // Apply gentle compression to prevent spikes
        const absValue = Math.abs(outputChannel[i]);
        if (absValue > 0.5) {
          outputChannel[i] = outputChannel[i] * 0.7;
        }
      }
    }
    
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);