<?php
// Run as an authorized server administrator inside the installed Coolify container.
// Uses native controllers and their authorization checks; does not enable the public API.
require getcwd().'/vendor/autoload.php';
$app = require getcwd().'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$user = App\Models\User::findOrFail(0);
if (!$user->isAdminOfTeam(0)) { throw new RuntimeException('Root team owner required'); }
$token = new Laravel\Sanctum\PersonalAccessToken;
$token->forceFill(['name'=>'staging-cli-session','team_id'=>0,'abilities'=>['read','write','deploy']]);
$user->withAccessToken($token);
Illuminate\Support\Facades\Auth::setUser($user);

function invokeController($class, $method, $path, $body, $routeUri=null, $params=[]) {
    $request = Illuminate\Http\Request::create($path,'POST',[],[],[],['CONTENT_TYPE'=>'application/json'],json_encode($body));
    $request->setUserResolver(fn()=>Illuminate\Support\Facades\Auth::user());
    if ($routeUri) {
        $route = new Illuminate\Routing\Route('POST',$routeUri,fn()=>null);
        $route->bind($request);
        foreach ($params as $key=>$value) { $route->setParameter($key,$value); }
        $request->setRouteResolver(fn()=>$route);
    }
    app()->instance('request',$request);
    $response = app($class)->$method($request);
    if ($response->getStatusCode() >= 300) { throw new RuntimeException($response->getContent()); }
    return $response->getData(true);
}

$project = App\Models\Project::whereTeamId(0)->whereName('Business Empire')->first();
if (!$project) {
    $result=invokeController(App\Http\Controllers\Api\ProjectController::class,'create_project','/api/v1/projects',
        ['name'=>'Business Empire','description'=>'Lava Bean application environments']);
    $project=App\Models\Project::whereUuid($result['uuid'])->firstOrFail();
}
$environment = $project->environments()->whereName('staging')->first();
if (!$environment) {
    invokeController(App\Http\Controllers\Api\ProjectController::class,'create_environment',
        '/api/v1/projects/'.$project->uuid.'/environments',['name'=>'staging'],
        'api/v1/projects/{uuid}/environments',['uuid'=>$project->uuid]);
    $environment=$project->environments()->whereName('staging')->firstOrFail();
}
$server=App\Models\Server::whereTeamId(0)->whereName('localhost')->firstOrFail();
$compose=file_get_contents($argv[1] ?? '/tmp/lavabean-compose.yaml');
if (!$compose || str_contains($compose,'@@')) { throw new RuntimeException('Rendered Compose required'); }
$existing=App\Models\Service::whereEnvironmentId($environment->id)->whereName('lavabean-staging')->first();
if ($existing) {
    echo json_encode(['project_uuid'=>$project->uuid,'environment_uuid'=>$environment->uuid,
        'service_uuid'=>$existing->uuid,'message'=>'Already registered; use Coolify to redeploy']).PHP_EOL;
    exit;
}
$result=invokeController(App\Http\Controllers\Api\ServicesController::class,'create_service','/api/v1/services',[
    'name'=>'lavabean-staging',
    'description'=>'Private Tailscale storefront and fictional dealer demo. No production integrations.',
    'project_uuid'=>$project->uuid,'environment_uuid'=>$environment->uuid,'server_uuid'=>$server->uuid,
    'docker_compose_raw'=>base64_encode($compose),'instant_deploy'=>true,
    'connect_to_docker_network'=>false
]);
echo json_encode(['project_uuid'=>$project->uuid,'environment_uuid'=>$environment->uuid,
    'server_uuid'=>$server->uuid,'service_uuid'=>$result['uuid'],'message'=>'Coolify deployment queued']).PHP_EOL;
