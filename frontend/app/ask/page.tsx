import AskBox from '../../components/AskBox';

export default function AskPage() {
  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='container mx-auto py-8'>
        <div className='text-center mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 mb-2'>
            Ask InsightGraph AI
          </h1>
          <p className='text-gray-600'>
            Ask questions about your uploaded documents and get AI-powered
            answers with sources.
          </p>
        </div>
        <AskBox />
      </div>
    </div>
  );
}
