import { Link, useNavigate } from 'react-router-dom';
import React, {useState, useEffect} from 'react';
import {supabase} from '../lib/supabaseClient'; //connect to the supabase instance

//create an item listing with these features
const CreateListing = () => { 
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading]= useState(false);
    const [suggestion, setSuggestion] = useState({price:null, source: ''});
    const[selectedFiles, setSelectedFiles] =useState([]);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '',
        category_id: '',
        condition: 'good',
        listing_type: 'sale'
  });

  //fetch real categories from the database to satisfy foreign key constraints
  useEffect(() => {
    const fetchCategories =async ()=>{
        const {data} = await supabase.from('categories').select('*');
        setCategories(data || []);
    };
    fetchCategories();
  }, []);


  //price suggestion logic that has keyword Detection and sa data
 const handlePriceSuggestion = (catId) => {
  const selectedCat = categories.find(c => c.id === catId);
  if (!selectedCat) return;

  const title = formData.title.toLowerCase();
  let marketBasePrice = 300; // default

  //Dynamic Base Price based on Keywords and Category
  if (selectedCat.name === 'Electronics') {
    if (title.includes('laptop') || title.includes('macbook')) marketBasePrice = 8000;
    else if (title.includes('phone') || title.includes('iphone')) marketBasePrice = 5000;
    else if (title.includes('headphone') || title.includes('jbl')) marketBasePrice = 1200;
    else marketBasePrice = 1500; 
  } 
  else if (selectedCat.name === 'Textbooks') {
    if (title.includes('engineering') || title.includes('medicine')) marketBasePrice = 900;
    else marketBasePrice = 500; 
  }
  else if (selectedCat.name === 'Clothing') {
    if (title.includes('jacket') || title.includes('shoes')) marketBasePrice = 800;
    else marketBasePrice = 250; 
  }

  // Condition Multipliers 
  let baseMultiplier = 0.5; 
  if (formData.condition === 'new') baseMultiplier = 0.90;
  else if (formData.condition === 'like_new') baseMultiplier = 0.75;
  else if (formData.condition === 'poor') baseMultiplier = 0.25;

  let finalMultiplier = baseMultiplier;
  let source = "General Market Estimate";

  //Apply Stats SA Inflation/Deflation 
  if (selectedCat.name === 'Textbooks') {
    finalMultiplier = baseMultiplier * 1.08; 
    source = "Stats SA P0141: Education deflation -3.3% (Adjusted for high campus demand)";
  } 
  else if (selectedCat.name === 'Electronics') {
    finalMultiplier = baseMultiplier * 0.90; 
    source = "Market Trend: Tech depreciation (Electronics lose value 10% faster)";
  }

  setSuggestion({ 
    price: (marketBasePrice * finalMultiplier).toFixed(2), 
    source 
  }); 
};


  const handleSubmit =async (e) => {
    e.preventDefault();
    
    // Ensure category and images are present
    if (!formData.category_id) {
        alert("Please select a category first!");
        return;
    }
    if (selectedFiles.length === 0) {
        alert("Please upload at least one image.");
        return;
    }

    setLoading(true);

    try{
        //upload images to storage bucket , uses dash in name 
        const imageUrls =[];
        for(const file of selectedFiles)
        {
            const filePath = `${Date.now()}_${file.name}`; 
            const {error:uploadError} =await supabase.storage.from('listing-images').upload(filePath,file);
            if (uploadError)throw uploadError;

            const{data:{publicUrl}} =supabase.storage.from('listing-images').getPublicUrl(filePath);
            imageUrls.push(publicUrl);
        }

        // Insert listing with valid uuid to satisfy FK constraints
        const {data: listingData, error: listingError} = await supabase.from('listings').insert([{
            user_id: 'fdf99acc-3d76-45db-9fb2-63987be3a5df', // Alice from users table
            category_id: formData.category_id,
            title: formData.title,
            description: formData.description,
            condition: formData.condition,
            // If trade, price is null
            price: formData.listing_type === 'trade' ? null : parseFloat(formData.price || 0), 
            listing_type: formData.listing_type,
            status: 'active'
        }]).select();

        if (listingError) throw listingError;

        // Link images to listing_images table, uses underscore in name
        const listingId = listingData[0].id;
        const imageRecords = imageUrls.map((url, index) => ({
            listing_id: listingId,
            image_url: url,
            display_order: index
        }));

        const {error:imgError} = await supabase.from('listing_images').insert(imageRecords);
        if(imgError) throw imgError;

        alert("Successfully created listing!");

      
        navigate('/basket');
    }
    catch (err) 
    {
        alert("Error: " + err.message);  
    }
    finally
    {
        setLoading(false);
    }
  };


  return (
  <div className="form-card">
    <h2 style={{marginTop: 0}}>Create New Listing</h2>
    <p style={{color: '#666', marginBottom: '30px'}}>Reach campus buyers instantly.</p>

    <form onSubmit={handleSubmit}>
      <div className="input-group">
        <label>Item Name</label>
        <input 
          placeholder="e.g. Engineering Maths Textbook" 
          required
          value={formData.title}
          onChange={(e) => {
            setFormData({...formData, title: e.target.value});
            if(formData.category_id) handlePriceSuggestion(formData.category_id);
          }}
        />
      </div>

      <div className="input-group">
        <label>Description</label>
        <textarea 
          placeholder="Condition, edition, etc." 
          required
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
        />
      </div>

      <div className="row">
        <div className="input-group">
          <label>Condition</label>
          <select value={formData.condition} onChange={(e) => setFormData({...formData, condition: e.target.value})}>
            <option value="new">New</option>
            <option value="like_new">Like New</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>
        </div>
        <div className="input-group">
          <label>Listing Type</label>
          <select value={formData.listing_type} onChange={(e) => setFormData({...formData, listing_type: e.target.value})}>
            <option value="sale">For Sale</option>
            <option value="trade">Swap</option>
            <option value="either">Either</option>
          </select>
        </div>
      </div>

      <div className="input-group">
        <label>Price (R)</label>
        <input 
          type="number"
          placeholder={formData.listing_type === 'trade' ? "No price for swaps" : "e.g. 250"}
          value={formData.listing_type === 'trade' ? '' : formData.price} 
          disabled={formData.listing_type === 'trade'} 
          onChange={(e) => setFormData({...formData, price: e.target.value})}
          style={{
            backgroundColor: formData.listing_type === 'trade' ? '#f3f4f6' : 'white',
            cursor: formData.listing_type === 'trade' ? 'not-allowed' : 'text'
          }}
        />
      </div>

      <div className="input-group">
        <label>Category</label>
        <select 
          required
          value={formData.category_id}
          onChange={(e) => {
            setFormData({...formData, category_id: e.target.value});
            handlePriceSuggestion(e.target.value);
          }}
        >
          <option value="">Select Category</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        
        {suggestion.price && formData.listing_type !== 'trade' && (
          <div className="suggestion">
            <strong>💡 Suggested: R{suggestion.price}</strong>
            <div style={{fontSize: '11px', color: '#555'}}>{suggestion.source}</div>
            
            {/* Comparison Logic */}
            {formData.price && (
              <div style={{
                marginTop: '5px', 
                fontSize: '12px', 
                fontWeight: 'bold',
                color: parseFloat(formData.price) > parseFloat(suggestion.price) ? '#d9534f' : '#5cb85c'
              }}>
                {parseFloat(formData.price) > parseFloat(suggestion.price) 
                  ? "⚠️ Your price is above the market estimate." 
                  : "✅ Great price! This should sell fast."}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="input-group">
        <label>Product Image</label>
        <input 
          type="file" 
          multiple 
          onChange={(e) => setSelectedFiles(Array.from(e.target.files))} 
        />
      </div>

      <button type="submit" className="btn-post" disabled={loading}>
        {loading ? 'Posting...' : '🚀 Post Listing'}
      </button>
    </form>
    <div className="bottomNav">
        {/* 🟢 This Link takes the user back to your marketplace grid */}
        <Link to="/basket">
          <button>SHOP</button>
        </Link>
        
        <button className="activeBottom">SELL</button>
        
        <button onClick={() => alert("Profile coming soon!")}>PROFILE</button>
      </div>
  </div>
);
};

export default CreateListing;