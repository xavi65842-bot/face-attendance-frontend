# Backend Face Validation Implementation

## 🚨 CRITICAL: New Backend Endpoint Required

To fix the face authentication issue, you need to implement this new PHP endpoint in your backend:

### **File:** `face-attendance-api/api/check-face.php`

```php
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    // Get the JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['image'])) {
        echo json_encode(['success' => false, 'message' => 'No image provided']);
        exit;
    }
    
    $imageData = $input['image'];
    
    // Remove data URL prefix if present
    if (strpos($imageData, 'data:image') === 0) {
        $imageData = substr($imageData, strpos($imageData, ',') + 1);
    }
    
    // Decode base64 image
    $imageBytes = base64_decode($imageData);
    if ($imageBytes === false) {
        echo json_encode(['success' => false, 'message' => 'Invalid image data']);
        exit;
    }
    
    // Initialize AWS Rekognition client
    require_once 'vendor/autoload.php'; // Make sure AWS SDK is installed
    
    $rekognition = new Aws\Rekognition\RekognitionClient([
        'version' => 'latest',
        'region' => 'your-aws-region', // e.g., 'us-east-1'
        'credentials' => [
            'key' => 'your-aws-access-key',
            'secret' => 'your-aws-secret-key'
        ]
    ]);
    
    $collectionId = 'face-attendance-collection'; // Your collection name
    
    try {
        // Search for faces in the collection
        $result = $rekognition->searchFacesByImage([
            'CollectionId' => $collectionId,
            'Image' => ['Bytes' => $imageBytes],
            'MaxFaces' => 1,
            'FaceMatchThreshold' => 80 // 80% confidence threshold
        ]);
        
        if (!empty($result['FaceMatches'])) {
            // Face found - get the student details
            $faceId = $result['FaceMatches'][0]['Face']['FaceId'];
            
            // Query database to get student info by face_id
            // Replace with your database connection
            $pdo = new PDO('mysql:host=localhost;dbname=face_attendance', $username, $password);
            $stmt = $pdo->prepare("SELECT student_id, full_name FROM students WHERE face_id = ?");
            $stmt->execute([$faceId]);
            $student = $stmt->fetch(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'exists' => true,
                'message' => 'Face already registered',
                'student' => $student,
                'confidence' => $result['FaceMatches'][0]['Similarity']
            ]);
        } else {
            // Face not found - safe to register
            echo json_encode([
                'success' => true,
                'exists' => false,
                'message' => 'Face not found in system'
            ]);
        }
        
    } catch (Aws\Rekognition\Exception\InvalidParameterException $e) {
        echo json_encode([
            'success' => false,
            'message' => 'No face detected in image'
        ]);
    }
    
} catch (Exception $e) {
    error_log("Face check error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Face validation failed: ' . $e->getMessage()
    ]);
}
?>
```

## 🔧 **Required Database Changes**

Make sure your `students` table has a `face_id` column to store the AWS Rekognition Face ID:

```sql
ALTER TABLE students ADD COLUMN face_id VARCHAR(255) UNIQUE AFTER student_id;
```

## 📝 **Update Your Registration Endpoint**

In your existing `register.php`, make sure to:

1. **Check for duplicate Student ID** (you probably already do this)
2. **Check for duplicate face** using the new endpoint logic
3. **Store the face_id** when adding to Rekognition collection

Example addition to your `register.php`:

```php
// After successfully adding face to Rekognition collection
$faceId = $result['FaceRecords'][0]['Face']['FaceId'];

// Store face_id in database
$stmt = $pdo->prepare("INSERT INTO students (student_id, full_name, department, year_intake, semester, face_id, registered_at) VALUES (?, ?, ?, ?, ?, ?, NOW())");
$stmt->execute([$studentId, $fullName, $department, $yearIntake, $semester, $faceId]);
```

## 🧪 **Testing the Fix**

After implementing the backend endpoint:

1. **Test 1**: Register a new student → Should work normally
2. **Test 2**: Try to register the same person with a different Student ID → Should be blocked
3. **Test 3**: Try to register a different person with the same Student ID → Should be blocked
4. **Test 4**: Register a completely different person → Should work normally

## 🔒 **Security Benefits**

This implementation provides:

✅ **Face Uniqueness**: Each face can only be registered once  
✅ **Student ID Uniqueness**: Each ID can only be used once  
✅ **Cross-Reference Protection**: Can't use someone else's ID  
✅ **Duplicate Prevention**: Same person can't register multiple times  

## 📋 **Frontend Changes Made**

The frontend now:

1. **Validates Student ID format** (minimum 6 characters, letters/numbers only)
2. **Checks face uniqueness** before registration
3. **Shows clear error messages** if face or ID already exists
4. **Provides better user guidance** about security features

## 🚀 **Next Steps**

1. Implement the `check-face.php` endpoint in your backend
2. Update your `register.php` to store `face_id`
3. Test the registration process
4. Verify that duplicate registrations are blocked

The frontend is ready and will work as soon as you implement the backend endpoint!